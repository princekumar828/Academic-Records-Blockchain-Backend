from fastapi import APIRouter, HTTPException, Depends, Query
from models.schemas import EmbeddingResponse, EmbeddingSyncRequest
from models.database import get_database
from services.face_recognition_service import FaceRecognitionService
from config import get_settings
from typing import Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/embeddings", tags=["embeddings"])
settings = get_settings()


@router.get("/sync")
async def get_embeddings(
    classroom_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db=Depends(get_database)
):
    """
    Get embeddings for synchronization to Pi devices
    
    - Filter by classroom_id: Returns embeddings for all students enrolled in courses 
      that are scheduled in this classroom
    - Filter by department: Returns embeddings for all students in that department
    - Used by Pi devices to download and cache embeddings locally
    """
    try:
        student_ids = set()
        
        if classroom_id:
            # Find all courses assigned to this classroom
            courses_cursor = db.courses.find({"classroom_ids": classroom_id})
            course_ids = []
            
            async for course in courses_cursor:
                course_ids.append(str(course["_id"]))
            
            if course_ids:
                # Find all students enrolled in these courses
                enrollments_cursor = db.enrollments.find({"course_id": {"$in": course_ids}})
                
                async for enrollment in enrollments_cursor:
                    student_ids.add(enrollment["student_id"])
                
                logger.info(f"Found {len(student_ids)} students enrolled in {len(course_ids)} courses for classroom {classroom_id}")
            else:
                logger.warning(f"No courses found for classroom {classroom_id}")
        
        elif department:
            # Get all students in this department
            students_cursor = db.students.find({"department": department})
            
            async for student in students_cursor:
                student_ids.add(student["student_id"])
        
        # Fetch embeddings for these students
        embeddings_list = []
        
        if student_ids:
            cursor = db.embeddings.find({"student_id": {"$in": list(student_ids)}}).sort("student_id", 1)
            
            async for embedding in cursor:
                # Get student info
                student = await db.students.find_one({"student_id": embedding["student_id"]})
                
                if student:
                    embeddings_list.append({
                        "student_id": embedding["student_id"],
                        "student_name": student["name"],
                        "embedding_index": embedding["embedding_index"],
                        "embedding_data": embedding["embedding_data"],
                        "metadata": {
                            "batch": student["batch"],
                            "department": student.get("department"),
                            "created_at": embedding["created_at"].isoformat()
                        }
                    })
        
        logger.info(f"Retrieved {len(embeddings_list)} embeddings for sync (classroom: {classroom_id}, dept: {department})")
        
        return {
            "total_embeddings": len(embeddings_list),
            "classroom_id": classroom_id,
            "department": department,
            "sync_timestamp": datetime.utcnow().isoformat(),
            "embeddings": embeddings_list
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve embeddings: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve embeddings")


@router.get("/student/{student_id}")
async def get_student_embeddings(student_id: str, db=Depends(get_database)):
    """Get all embeddings for a specific student"""
    try:
        # Check if student exists
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Fetch embeddings
        embeddings_list = []
        cursor = db.embeddings.find({"student_id": student_id}).sort("embedding_index", 1)
        
        async for embedding in cursor:
            embeddings_list.append({
                "embedding_index": embedding["embedding_index"],
                "embedding_data": embedding["embedding_data"],
                "face_location": embedding.get("face_location"),
                "created_at": embedding["created_at"].isoformat()
            })
        
        return {
            "student_id": student_id,
            "student_name": student["name"],
            "total_embeddings": len(embeddings_list),
            "embeddings": embeddings_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve student embeddings: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve embeddings")


@router.post("/verify")
async def verify_embeddings(
    classroom_id: str,
    db=Depends(get_database)
):
    """
    Verify embeddings integrity for a classroom
    
    - Checks if embeddings exist for all students
    - Returns statistics about embedding coverage
    """
    try:
        # Count students
        total_students = await db.students.count_documents({"classroom_id": classroom_id})
        
        # Get students with embeddings
        pipeline = [
            {"$match": {"classroom_id": classroom_id}},
            {
                "$lookup": {
                    "from": "embeddings",
                    "localField": "student_id",
                    "foreignField": "student_id",
                    "as": "embeddings"
                }
            },
            {
                "$project": {
                    "student_id": 1,
                    "name": 1,
                    "embeddings_count": {"$size": "$embeddings"}
                }
            }
        ]
        
        students_with_embeddings = []
        students_without_embeddings = []
        
        cursor = db.students.aggregate(pipeline)
        async for student in cursor:
            if student["embeddings_count"] > 0:
                students_with_embeddings.append({
                    "student_id": student["student_id"],
                    "name": student["name"],
                    "embeddings_count": student["embeddings_count"]
                })
            else:
                students_without_embeddings.append({
                    "student_id": student["student_id"],
                    "name": student["name"]
                })
        
        coverage_percentage = (len(students_with_embeddings) / total_students * 100) if total_students > 0 else 0
        
        return {
            "classroom_id": classroom_id,
            "total_students": total_students,
            "students_with_embeddings": len(students_with_embeddings),
            "students_without_embeddings": len(students_without_embeddings),
            "coverage_percentage": round(coverage_percentage, 2),
            "details": {
                "with_embeddings": students_with_embeddings,
                "without_embeddings": students_without_embeddings
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to verify embeddings: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify embeddings")
