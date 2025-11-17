"""
Teachers API endpoints
Provides CRUD operations for teacher management
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from models.database import get_database
from api.auth import get_current_user, get_password_hash
from models.schemas import TeacherCreate, TeacherUpdate, TeacherResponse
from bson import ObjectId
import secrets

router = APIRouter(prefix="/api/teachers", tags=["teachers"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_all_teachers(
    department: Optional[str] = None
):
    """
    Get all teachers
    
    Query Parameters:
    - department: Filter by department (optional)
    """
    db = get_database()
    
    # Build query
    query = {"role": "teacher"}
    if department:
        query["department"] = department
    
    # Fetch teachers from users collection
    teachers_cursor = db.users.find(query)
    teachers = []
    
    async for teacher in teachers_cursor:
        # Get course count for this teacher
        courses_count = await db.courses.count_documents({"teacher_id": teacher.get("teacher_id")})
        
        teachers.append({
            "teacher_id": teacher.get("teacher_id"),
            "name": teacher.get("name"),
            "email": teacher.get("email"),
            "department": teacher.get("department"),
            "phone": teacher.get("phone"),
            "courses_count": courses_count,
            "created_at": teacher.get("created_at"),
        })
    
    return {"data": teachers, "count": len(teachers)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_teacher(
    teacher: TeacherCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new teacher
    
    - Creates teacher user account with role "teacher"
    - Generates temporary password
    - Returns teacher info and credentials
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create teachers"
        )
    
    db = get_database()
    
    # Check if teacher_id or email already exists
    existing_teacher = await db.users.find_one({
        "$or": [
            {"teacher_id": teacher.teacher_id},
            {"email": teacher.email}
        ],
        "role": "teacher"
    })
    
    if existing_teacher:
        if existing_teacher.get("teacher_id") == teacher.teacher_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teacher with ID {teacher.teacher_id} already exists"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teacher with email {teacher.email} already exists"
            )
    
    # Generate temporary password
    temp_password = secrets.token_urlsafe(8)
    hashed_password = get_password_hash(temp_password)
    
    # Create teacher user document
    teacher_doc = {
        "teacher_id": teacher.teacher_id,
        "name": teacher.name,
        "email": teacher.email,
        "password": hashed_password,
        "role": "teacher",
        "department": teacher.department,
        "phone": teacher.phone,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    # Insert teacher
    result = await db.users.insert_one(teacher_doc)
    
    # Return response with credentials
    return {
        "teacher": {
            "teacher_id": teacher.teacher_id,
            "name": teacher.name,
            "email": teacher.email,
            "department": teacher.department,
            "phone": teacher.phone,
            "courses_count": 0,
            "created_at": teacher_doc["created_at"],
        },
        "credentials": {
            "email": teacher.email,
            "password": temp_password
        }
    }


@router.get("/{teacher_id}", status_code=status.HTTP_200_OK)
async def get_teacher(
    teacher_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get teacher by ID
    """
    db = get_database()
    
    teacher = await db.users.find_one({
        "teacher_id": teacher_id,
        "role": "teacher"
    })
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found"
        )
    
    # Get assigned courses
    courses_cursor = db.courses.find({"teacher_id": teacher_id})
    assigned_courses = []
    
    async for course in courses_cursor:
        assigned_courses.append({
            "course_id": str(course["_id"]),
            "course_code": course.get("course_code"),
            "title": course.get("title"),
        })
    
    return {
        "teacher_id": teacher.get("teacher_id"),
        "name": teacher.get("name"),
        "email": teacher.get("email"),
        "department": teacher.get("department"),
        "phone": teacher.get("phone"),
        "assigned_courses": assigned_courses,
        "courses_count": len(assigned_courses),
        "created_at": teacher.get("created_at"),
    }


@router.put("/{teacher_id}", status_code=status.HTTP_200_OK)
async def update_teacher(
    teacher_id: str,
    teacher_update: TeacherUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a teacher (Admin only)
    
    - Updates teacher information in users collection
    - Cannot update teacher_id
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update teachers"
        )
    
    db = get_database()
    
    # Find teacher
    teacher = await db.users.find_one({
        "teacher_id": teacher_id,
        "role": "teacher"
    })
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found"
        )
    
    # Prepare update data
    update_data = {
        k: v for k, v in teacher_update.model_dump(exclude_unset=True).items()
        if v is not None
    }
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Check if email is being changed and it's not already taken
    if "email" in update_data and update_data["email"] != teacher["email"]:
        existing_email = await db.users.find_one({
            "email": update_data["email"],
            "teacher_id": {"$ne": teacher_id}
        })
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another user"
            )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update teacher
    await db.users.update_one(
        {"teacher_id": teacher_id, "role": "teacher"},
        {"$set": update_data}
    )
    
    # Get updated teacher
    updated_teacher = await db.users.find_one({
        "teacher_id": teacher_id,
        "role": "teacher"
    })
    
    # Get course count
    courses_count = await db.courses.count_documents({"teacher_id": teacher_id})
    
    return {
        "teacher_id": updated_teacher.get("teacher_id"),
        "name": updated_teacher.get("name"),
        "email": updated_teacher.get("email"),
        "department": updated_teacher.get("department"),
        "phone": updated_teacher.get("phone"),
        "courses_count": courses_count,
        "created_at": updated_teacher.get("created_at"),
        "updated_at": updated_teacher.get("updated_at"),
    }


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a teacher (Admin only)
    
    - Removes teacher from users collection
    - Note: Courses assigned to this teacher should be reassigned first
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete teachers"
        )
    
    db = get_database()
    
    # Find teacher
    teacher = await db.users.find_one({
        "teacher_id": teacher_id,
        "role": "teacher"
    })
    
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {teacher_id} not found"
        )
    
    # Check if teacher has assigned courses
    courses_count = await db.courses.count_documents({"teacher_id": teacher_id})
    if courses_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete teacher with {courses_count} assigned course(s). Please reassign courses first."
        )
    
    # Delete teacher
    result = await db.users.delete_one({
        "teacher_id": teacher_id,
        "role": "teacher"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete teacher"
        )
    
    return None
