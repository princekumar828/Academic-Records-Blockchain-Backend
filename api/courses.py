from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import logging

from models.database import get_database
from models.schemas import (
    CourseCreate, CourseUpdate, CourseResponse,
    EnrollmentCreate, EnrollmentBulkCreate, EnrollmentResponse
)
from api.auth import get_current_user
from mqtt.client import get_mqtt_client

router = APIRouter(prefix="/courses", tags=["courses"])
logger = logging.getLogger(__name__)


def serialize_course(course: dict) -> dict:
    """Convert MongoDB document to API response format"""
    if course:
        course["course_id"] = str(course.pop("_id"))
        return course
    return None


def serialize_enrollment(enrollment: dict) -> dict:
    """Convert MongoDB enrollment document to API response format"""
    if enrollment:
        enrollment["enrollment_id"] = str(enrollment.pop("_id"))
        return enrollment
    return None


# ===== Course CRUD Operations =====

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_course(
    course: CourseCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create courses"
        )
    
    db = get_database()
    
    # Check if course code already exists
    existing = await db.courses.find_one({"course_code": course.course_code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Course with code {course.course_code} already exists"
        )
    
    # Verify teacher exists
    teacher = await db.users.find_one({
        "teacher_id": course.teacher_id,
        "role": "teacher"
    })
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {course.teacher_id} not found"
        )
    
    # Create course document
    course_doc = {
        **course.model_dump(),
        "classroom_ids": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.courses.insert_one(course_doc)
    course_doc["_id"] = result.inserted_id
    
    # Get teacher name for response
    course_doc["teacher_name"] = teacher.get("name")
    course_doc["enrolled_students_count"] = 0
    
    # Serialize before returning (convert _id to course_id)
    serialized = serialize_course(course_doc)
    
    return serialized


@router.get("/")
async def get_all_courses(
    teacher_id: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[int] = None
):
    """Get all courses with optional filters"""
    db = get_database()
    
    query = {}
    if teacher_id:
        query["teacher_id"] = teacher_id
    if department:
        query["department"] = department
    if year:
        query["year"] = year
    
    courses = await db.courses.find(query).to_list(1000)
    
    # Enrich with teacher names and enrollment counts
    courses_data = []
    for course in courses:
        teacher = await db.users.find_one({"teacher_id": course["teacher_id"]})
        teacher_name = teacher.get("name") if teacher else "Unknown"
        
        enrollment_count = await db.enrollments.count_documents({
            "course_id": str(course["_id"])
        })
        
        course_data = {
            "course_id": str(course["_id"]),
            "course_code": course.get("course_code"),
            "title": course.get("title"),
            "teacher_id": course.get("teacher_id"),
            "teacher_name": teacher_name,
            "year": course.get("year"),
            "class_code": course.get("class_code"),
            "department": course.get("department"),
            "description": course.get("description"),
            "classroom_ids": course.get("classroom_ids", []),
            "enrolled_students_count": enrollment_count,
            "created_at": course.get("created_at"),
        }
        courses_data.append(course_data)
    
    return {"data": courses_data, "count": len(courses_data)}





@router.put("/{course_id}")
async def update_course(
    course_id: str,
    course_update: CourseUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update courses"
        )
    
    db = get_database()
    
    # Try to convert to ObjectId
    try:
        course_oid = ObjectId(course_id)
        course = await db.courses.find_one({"_id": course_oid})
    except Exception:
        # If not a valid ObjectId, try looking up by course_code
        course = await db.courses.find_one({"course_code": course_id})
        if course:
            course_oid = course["_id"]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Prepare update data
    update_data = {
        k: v for k, v in course_update.model_dump(exclude_unset=True).items()
        if v is not None
    }
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # If teacher is being changed, verify new teacher exists
    if "teacher_id" in update_data:
        teacher = await db.users.find_one({
            "teacher_id": update_data["teacher_id"],
            "role": "teacher"
        })
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {update_data['teacher_id']} not found"
            )
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.courses.update_one(
        {"_id": course_oid},
        {"$set": update_data}
    )
    
    # Get updated course
    updated_course = await db.courses.find_one({"_id": course_oid})
    
    # Get teacher name
    teacher = await db.users.find_one({"teacher_id": updated_course["teacher_id"]})
    updated_course["teacher_name"] = teacher.get("name") if teacher else "Unknown"
    
    # Get enrollment count
    enrollment_count = await db.enrollments.count_documents({
        "course_id": str(updated_course["_id"])
    })
    updated_course["enrolled_students_count"] = enrollment_count
    
    return serialize_course(updated_course)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete courses"
        )
    
    db = get_database()
    
    # Try to convert to ObjectId
    try:
        course_oid = ObjectId(course_id)
        course = await db.courses.find_one({"_id": course_oid})
    except Exception:
        # If not a valid ObjectId, try looking up by course_code
        course = await db.courses.find_one({"course_code": course_id})
        if course:
            course_oid = course["_id"]
        else:
            course = None
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Delete the course
    result = await db.courses.delete_one({"_id": course_oid})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete course"
        )
    
    # Also delete all enrollments for this course
    await db.enrollments.delete_many({"course_id": str(course_oid)})
    
    return None


# ===== Classroom Assignment =====

@router.post("/{course_id}/classrooms/{classroom_id}", status_code=status.HTTP_200_OK)
async def assign_classroom_to_course(
    course_id: str,
    classroom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Assign a classroom (Pi device) to a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can assign classrooms"
        )
    
    db = get_database()
    
    try:
        course_oid = ObjectId(course_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid course ID format"
        )
    
    # Verify course exists
    course = await db.courses.find_one({"_id": course_oid})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Verify classroom exists
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Classroom not found"
        )
    
    # Add classroom to course
    await db.courses.update_one(
        {"_id": course_oid},
        {
            "$addToSet": {"classroom_ids": classroom_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Trigger embedding sync for this classroom
    # Get all students enrolled in this course
    enrollments = await db.enrollments.find({"course_id": course_id}).to_list(None)
    if enrollments:
        student_ids = [e["student_id"] for e in enrollments]
        mqtt = get_mqtt_client()
        mqtt.publish_embedding_sync(classroom_id, student_ids)
        logger.info(f"Triggered embedding sync for classroom {classroom_id} with {len(student_ids)} students")
    
    return {"message": "Classroom assigned successfully"}


@router.delete("/{course_id}/classrooms/{classroom_id}", status_code=status.HTTP_200_OK)
async def remove_classroom_from_course(
    course_id: str,
    classroom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a classroom from a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can remove classrooms"
        )
    
    db = get_database()
    
    try:
        course_oid = ObjectId(course_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid course ID format"
        )
    
    # Remove classroom from course
    await db.courses.update_one(
        {"_id": course_oid},
        {
            "$pull": {"classroom_ids": classroom_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Trigger embedding sync to remove students from this classroom
    mqtt = get_mqtt_client()
    mqtt.publish_embedding_sync(classroom_id)
    logger.info(f"Triggered embedding sync for classroom {classroom_id} after removing course")
    
    return {"message": "Classroom removed successfully"}


# ===== Enrollment Management =====

@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_student(
    enrollment: EnrollmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Enroll a student in a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can enroll students"
        )
    
    db = get_database()
    
    # Verify course exists
    try:
        course = await db.courses.find_one({"_id": ObjectId(enrollment.course_id)})
    except:
        course = await db.courses.find_one({"course_code": enrollment.course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course_id_str = str(course["_id"])
    
    # Verify student exists in students collection
    student = await db.students.find_one({"student_id": enrollment.student_id})
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    
    # Check if already enrolled
    existing = await db.enrollments.find_one({
        "student_id": enrollment.student_id,
        "course_id": course_id_str
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in this course"
        )
    
    # Create enrollment
    enrollment_doc = {
        "student_id": enrollment.student_id,
        "course_id": course_id_str,
        "enrolled_at": datetime.utcnow()
    }
    
    result = await db.enrollments.insert_one(enrollment_doc)
    enrollment_doc["_id"] = result.inserted_id
    enrollment_doc["student_name"] = student.get("name")
    enrollment_doc["course_title"] = course.get("title")
    
    # Trigger embedding sync for all classrooms where this course is taught
    if "classroom_ids" in course and course["classroom_ids"]:
        mqtt = get_mqtt_client()
        for classroom_id in course["classroom_ids"]:
            mqtt.publish_embedding_sync(classroom_id, [enrollment.student_id])
        logger.info(f"Triggered embedding sync for {len(course['classroom_ids'])} classroom(s) after enrolling student {enrollment.student_id}")
    
    return serialize_enrollment(enrollment_doc)


@router.post("/enrollments/bulk", status_code=status.HTTP_201_CREATED)
async def enroll_students_bulk(
    enrollment: EnrollmentBulkCreate,
    current_user: dict = Depends(get_current_user)
):
    """Enroll multiple students in a course at once (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can enroll students"
        )
    
    db = get_database()
    
    # Verify course exists
    try:
        course = await db.courses.find_one({"_id": ObjectId(enrollment.course_id)})
    except:
        course = await db.courses.find_one({"course_code": enrollment.course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    course_id_str = str(course["_id"])
    
    enrolled_count = 0
    skipped = []
    
    for student_id in enrollment.student_ids:
        # Check if student exists in students collection
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            skipped.append({"student_id": student_id, "reason": "Student not found"})
            continue
        
        # Check if already enrolled
        existing = await db.enrollments.find_one({
            "student_id": student_id,
            "course_id": course_id_str
        })
        if existing:
            skipped.append({"student_id": student_id, "reason": "Already enrolled"})
            continue
        
        # Create enrollment
        enrollment_doc = {
            "student_id": student_id,
            "course_id": course_id_str,
            "enrolled_at": datetime.utcnow()
        }
        
        await db.enrollments.insert_one(enrollment_doc)
        enrolled_count += 1
    
    # Trigger embedding sync for all classrooms where this course is taught
    if enrolled_count > 0 and "classroom_ids" in course and course["classroom_ids"]:
        mqtt = get_mqtt_client()
        for classroom_id in course["classroom_ids"]:
            mqtt.publish_embedding_sync(classroom_id)
        logger.info(f"Triggered embedding sync for {len(course['classroom_ids'])} classroom(s) after bulk enrollment")
    
    return {
        "message": f"Enrolled {enrolled_count} students",
        "enrolled_count": enrolled_count,
        "skipped": skipped
    }


@router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_enrollments(
    course_id: Optional[str] = None,
    student_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get enrollments with optional filters"""
    db = get_database()
    
    query = {}
    if course_id:
        query["course_id"] = course_id
    if student_id:
        query["student_id"] = student_id
    
    # If user is a student, only show their enrollments
    if current_user.get("role") == "student":
        query["student_id"] = current_user.get("student_id")
    
    enrollments = await db.enrollments.find(query).to_list(1000)
    
    # Enrich with student and course names
    for enrollment in enrollments:
        student = await db.students.find_one({"student_id": enrollment["student_id"]})
        enrollment["student_name"] = student.get("name") if student else "Unknown"
        
        try:
            course = await db.courses.find_one({"_id": ObjectId(enrollment["course_id"])})
        except:
            course = None
        enrollment["course_title"] = course.get("title") if course else "Unknown"
    
    return [serialize_enrollment(e) for e in enrollments]


@router.delete("/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_student(
    enrollment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a student from a course (Admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can unenroll students"
        )
    
    db = get_database()
    # Try multiple strategies to locate the enrollment so frontend variations don't break
    enrollment = None
    # 1) If enrollment_id looks like an ObjectId, try that first
    try:
        enrollment = await db.enrollments.find_one({"_id": ObjectId(enrollment_id)})
    except Exception:
        enrollment = None

    # 2) If not found, try matching any document that contains the string in common fields
    if not enrollment:
        # Try exact match on a stored enrollment_id field (if any)
        enrollment = await db.enrollments.find_one({"enrollment_id": enrollment_id})

    if not enrollment:
        # Try matching by student_id or course_id just in case the frontend sent one of those
        enrollment = await db.enrollments.find_one({"student_id": enrollment_id}) or \
                     await db.enrollments.find_one({"course_id": enrollment_id})

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )

    # Get the course to find which classrooms need sync
    course = await db.courses.find_one({"_id": ObjectId(enrollment["course_id"])})

    # Delete the found enrollment (use the actual _id value)
    result = await db.enrollments.delete_one({"_id": enrollment["_id"]})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete enrollment"
        )

    # Trigger embedding sync for all classrooms where this course is taught
    if course and "classroom_ids" in course and course["classroom_ids"]:
        mqtt = get_mqtt_client()
        for classroom_id in course["classroom_ids"]:
            mqtt.publish_embedding_sync(classroom_id)
        logger.info(f"Triggered embedding sync for {len(course['classroom_ids'])} classroom(s) after unenrollment")

    return None


# ===== Course Statistics =====


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific course by ID"""
    db = get_database()
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        course = await db.courses.find_one({"course_code": course_id})
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get teacher name
    teacher = await db.users.find_one({"teacher_id": course["teacher_id"]})
    course["teacher_name"] = teacher.get("name") if teacher else "Unknown"
    
    # Get enrollment count
    enrollment_count = await db.enrollments.count_documents({
        "course_id": str(course["_id"])
    })
    course["enrolled_students_count"] = enrollment_count
    
    return serialize_course(course)


@router.get("/{course_id}/statistics")
async def get_course_statistics(
    course_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a specific course"""
    db = get_database()
    
    try:
        course_oid = ObjectId(course_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid course ID format"
        )
    
    course = await db.courses.find_one({"_id": course_oid})
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get enrollment count
    enrollment_count = await db.enrollments.count_documents({"course_id": course_id})
    
    # Get session count
    session_count = await db.attendance_sessions.count_documents({"course_id": course_id})
    
    # Get active sessions
    active_sessions = await db.attendance_sessions.count_documents({
        "course_id": course_id,
        "status": "active"
    })
    
    # Get attendance statistics (simplified)
    sessions = await db.attendance_sessions.find({"course_id": course_id}).to_list(1000)
    total_present = sum(len(s.get("recognized_students", [])) for s in sessions)
    
    return {
        "course_id": course_id,
        "course_title": course.get("title"),
        "enrolled_students": enrollment_count,
        "total_sessions": session_count,
        "active_sessions": active_sessions,
        "total_attendance_records": total_present,
        "classrooms_assigned": len(course.get("classroom_ids", []))
    }
