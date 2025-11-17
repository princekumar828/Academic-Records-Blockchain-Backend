from fastapi import APIRouter, HTTPException, Depends
import secrets

from api.auth import get_password_hash
from models.schemas import StudentCreate, StudentResponse
from models.database import get_database
from services.face_recognition_service import FaceRecognitionService
from mqtt.client import get_mqtt_client
from config import get_settings
from datetime import datetime
import logging
import numpy as np

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/students", tags=["students"])
settings = get_settings()


def get_face_service():
    return FaceRecognitionService(
        tolerance=settings.FACE_RECOGNITION_TOLERANCE,
        model=settings.FACE_DETECTION_MODEL,
        num_jitters=settings.NUM_JITTERS
    )


@router.get("/")
async def get_all_students(db=Depends(get_database)):
    """
    Get all students
    Returns a list of all registered students
    """
    try:
        students_cursor = db.students.find({})
        students = []
        
        async for student in students_cursor:
            # Get enrollment count
            enrollments_count = await db.enrollments.count_documents({"student_id": student.get("student_id")})
            
            # Check if student has face embeddings
            embeddings_count = await db.embeddings.count_documents({"student_id": student.get("student_id")})
            
            students.append({
                "student_id": student.get("student_id"),
                "name": student.get("name"),
                "email": student.get("email"),
                "phone": student.get("phone"),
                "department": student.get("department"),
                "batch": student.get("batch"),
                "year": student.get("year"),
                "enrollments_count": enrollments_count,
                "has_face_data": embeddings_count > 0,
                "face_count": embeddings_count,
                "created_at": student.get("created_at"),
            })
        
        return {"data": students, "count": len(students)}
    except Exception as e:
        logger.error(f"Error fetching students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")


@router.post("/")
async def create_student(
    student: StudentCreate,
    db=Depends(get_database)
):
    """
    Create a new student without face images
    
    - Accepts student details only (face images optional)
    - Face images can be added later via /register endpoint
    """
    try:
        # Check if student already exists
        existing_student = await db.students.find_one({"student_id": student.student_id})
        if existing_student:
            raise HTTPException(status_code=400, detail="Student ID already exists")
        
        # Prepare student document (without embeddings)
        student_doc = {
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "batch": student.batch,
            "department": student.department,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "embeddings_count": 0
        }
        
        # Insert student
        await db.students.insert_one(student_doc)
        logger.info(f"Student {student.student_id} created successfully (without face data)")

        # Create / ensure user credentials for this student so they can login
        temp_password = secrets.token_urlsafe(8)
        hashed = get_password_hash(temp_password)

        user_doc = await db.users.find_one({"email": student.email}) if student.email else None

        if user_doc:
            # If a user already exists with this email, ensure student_id is set
            update_fields = {}
            if user_doc.get("student_id") != student.student_id:
                update_fields["student_id"] = student.student_id
            if update_fields:
                await db.users.update_one({"email": student.email}, {"$set": update_fields})
        else:
            # Create a new user account for the student
            new_user = {
                "email": student.email,
                "password": hashed,
                "name": student.name,
                "role": "student",
                "student_id": student.student_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await db.users.insert_one(new_user)
            logger.info(f"Created login for student {student.student_id} with email {student.email}")

        # Return response including generated credentials (plain temp password so admin can share)
        response = {
            "student": {
                "student_id": student_doc["student_id"],
                "name": student_doc["name"],
                "email": student_doc["email"],
                "phone": student_doc["phone"],
                "batch": student_doc["batch"],
                "department": student_doc["department"],
                "created_at": student_doc["created_at"],
                "updated_at": student_doc["updated_at"],
                "embeddings_count": 0
            },
            "credentials": {
                "email": student.email,
                "password": temp_password
            }
        }

        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create student: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create student: {str(e)}")


@router.post("/register", response_model=StudentResponse)
async def register_student(
    student: StudentCreate,
    db=Depends(get_database),
    face_service: FaceRecognitionService = Depends(get_face_service),
    mqtt=Depends(get_mqtt_client)
):
    """
    Register or update a student with face embeddings
    
    - Accepts student details and base64 encoded face images
    - Generates facial embeddings using face_recognition library
    - Creates new student or updates existing student with face data
    - Stores student data and embeddings in database
    - Triggers embedding sync to relevant Pi devices
    """
    try:
        # Check if student already exists
        existing_student = await db.students.find_one({"student_id": student.student_id})
        
        # Validate face images
        if not student.face_images:
            raise HTTPException(status_code=400, detail="At least one face image is required")
        
        # Generate face embeddings
        logger.info(f"Generating embeddings for student {student.student_id}")
        embeddings, face_locations = face_service.generate_embeddings(student.face_images)
        
        if not embeddings:
            raise HTTPException(
                status_code=400,
                detail="No faces detected in the provided images. Please provide clear face photos."
            )
        
        # Prepare student document
        student_doc = {
            "student_id": student.student_id,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "batch": student.batch,
            "department": student.department,
            "updated_at": datetime.utcnow(),
            "embeddings_count": len(embeddings)
        }
        
        if existing_student:
            # Update existing student
            student_doc["created_at"] = existing_student.get("created_at", datetime.utcnow())
            await db.students.update_one(
                {"student_id": student.student_id},
                {"$set": student_doc}
            )
            # Delete old embeddings
            await db.embeddings.delete_many({"student_id": student.student_id})
            logger.info(f"Student {student.student_id} updated with new face data")
        else:
            # Create new student
            student_doc["created_at"] = datetime.utcnow()
            await db.students.insert_one(student_doc)
            logger.info(f"Student {student.student_id} registered successfully")
        
        # Store embeddings
        embedding_docs = []
        for idx, embedding in enumerate(embeddings):
            # Encode embedding to base64
            encoded_embedding = face_service.encode_embedding(embedding)
            
            embedding_doc = {
                "student_id": student.student_id,
                "department": student.department,
                "embedding_index": idx,
                "embedding_data": encoded_embedding,
                "face_location": face_locations[idx],
                "created_at": datetime.utcnow()
            }
            embedding_docs.append(embedding_doc)
        
        if embedding_docs:
            await db.embeddings.insert_many(embedding_docs)
            logger.info(f"Stored {len(embedding_docs)} embedding(s) for student {student.student_id}")
        
        # Trigger embedding sync to all classrooms where student has courses
        # Find student's enrollments
        enrollments = await db.enrollments.find({"student_id": student.student_id}).to_list(None)
        synced_classrooms = set()
        
        for enrollment in enrollments:
            # Get course details
            course = await db.courses.find_one({"_id": enrollment["course_id"]})
            if course and "classroom_ids" in course:
                for classroom_id in course["classroom_ids"]:
                    if classroom_id not in synced_classrooms:
                        mqtt.publish_embedding_sync(classroom_id, [student.student_id])
                        synced_classrooms.add(classroom_id)
        
        if synced_classrooms:
            logger.info(f"Triggered embedding sync for {len(synced_classrooms)} classroom(s)")
        
        # Return response
        return StudentResponse(
            student_id=student_doc["student_id"],
            name=student_doc["name"],
            email=student_doc["email"],
            phone=student_doc["phone"],
            batch=student_doc["batch"],
            department=student_doc["department"],
            created_at=student_doc["created_at"],
            updated_at=student_doc["updated_at"],
            embeddings_count=student_doc["embeddings_count"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register student: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register student: {str(e)}")


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, db=Depends(get_database)):
    """Get student details by ID"""
    try:
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return StudentResponse(
            student_id=student["student_id"],
            name=student["name"],
            batch=student["batch"],
            department=student.get("department"),
            created_at=student["created_at"],
            updated_at=student["updated_at"],
            embeddings_count=student.get("embeddings_count", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve student: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve student")


@router.get("/classroom/{classroom_id}")
async def get_classroom_students(classroom_id: str, db=Depends(get_database)):
    """
    Get all students who have courses in this classroom
    Based on course enrollments
    """
    try:
        # Find all courses assigned to this classroom
        courses = await db.courses.find({"classroom_ids": classroom_id}).to_list(None)
        course_ids = [str(course["_id"]) for course in courses]
        
        if not course_ids:
            return {"classroom_id": classroom_id, "total_students": 0, "students": []}
        
        # Find all students enrolled in these courses
        student_ids = set()
        enrollments = await db.enrollments.find({"course_id": {"$in": course_ids}}).to_list(None)
        
        for enrollment in enrollments:
            student_ids.add(enrollment["student_id"])
        
        # Get student details
        students = []
        if student_ids:
            students_cursor = db.students.find({"student_id": {"$in": list(student_ids)}})
            
            async for student in students_cursor:
                students.append(StudentResponse(
                    student_id=student["student_id"],
                    name=student["name"],
                    batch=student["batch"],
                    department=student.get("department"),
                    created_at=student["created_at"],
                    updated_at=student["updated_at"],
                    embeddings_count=student.get("embeddings_count", 0)
                ))
        
        return {"classroom_id": classroom_id, "total_students": len(students), "students": students}
    except Exception as e:
        logger.error(f"Failed to retrieve classroom students: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve students")


@router.delete("/{student_id}")
async def delete_student(student_id: str, db=Depends(get_database)):
    """Delete a student and their embeddings"""
    try:
        # Find student
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if student is enrolled in any courses
        enrollments_count = await db.enrollments.count_documents({"student_id": student_id})
        if enrollments_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete student enrolled in {enrollments_count} course(s). Please remove enrollments first."
            )
        
        # Delete embeddings
        await db.embeddings.delete_many({"student_id": student_id})
        
        # Delete student user account
        await db.users.delete_one({"email": student.get("email")})
        
        # Delete student
        await db.students.delete_one({"student_id": student_id})
        
        logger.info(f"Deleted student {student_id} and their embeddings")
        return {"message": "Student deleted successfully", "student_id": student_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete student: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete student")
