"""
Statistics API endpoints
Provides dashboard statistics and analytics for different user roles
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from typing import Optional
from models.database import get_database

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/dashboard/{role}")
async def get_dashboard_stats(role: str, db=Depends(get_database)):
    """
    Get dashboard statistics based on user role
    Role can be: admin, teacher, or student
    """
    try:
        stats = {}
        
        if role == "admin":
            # Get counts for all entities
            students_count = await db.students.count_documents({})
            teachers_count = await db.users.count_documents({"role": "teacher"})
            courses_count = await db.courses.count_documents({})
            classrooms_count = await db.classrooms.count_documents({})
            
            # Get recent attendance sessions
            sessions_count = await db.attendance_sessions.count_documents({})
            
            # Get today's attendance count
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_sessions = await db.attendance_sessions.count_documents({
                "start_time": {"$gte": today_start}
            })
            
            stats = {
                "total_students": students_count,
                "total_teachers": teachers_count,
                "total_courses": courses_count,
                "total_classrooms": classrooms_count,
                "total_sessions": sessions_count,
                "today_sessions": today_sessions,
                "role": "admin"
            }
            
        elif role == "teacher":
            # Teacher-specific statistics would go here
            # For now, return basic stats
            stats = {
                "total_courses": 0,
                "active_students": 0,
                "today_sessions": 0,
                "role": "teacher"
            }
            
        elif role == "student":
            # Student-specific statistics would go here
            stats = {
                "enrolled_courses": 0,
                "attendance_rate": 0,
                "total_sessions": 0,
                "role": "student"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")


@router.get("/classroom/{classroom_id}")
async def get_classroom_stats(classroom_id: str, db=Depends(get_database)):
    """Get statistics for a specific classroom"""
    try:
        # Check if classroom exists
        classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
        if not classroom:
            raise HTTPException(status_code=404, detail="Classroom not found")
        
        # Get sessions count
        sessions_count = await db.attendance_sessions.count_documents({
            "classroom_id": classroom_id
        })
        
        # Get active session
        active_session = await db.attendance_sessions.find_one({
            "classroom_id": classroom_id,
            "status": "active"
        })
        
        stats = {
            "classroom_id": classroom_id,
            "total_sessions": sessions_count,
            "has_active_session": active_session is not None,
            "classroom_name": classroom.get("name", "")
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching classroom stats: {str(e)}")


@router.get("/student/{student_id}")
async def get_student_stats(student_id: str, db=Depends(get_database)):
    """Get statistics for a specific student"""
    try:
        # Check if student exists
        student = await db.students.find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get enrolled courses count
        enrollments_count = await db.enrollments.count_documents({
            "student_id": student_id
        })
        
        # Get attendance records count
        attendance_count = await db.attendance_records.count_documents({
            "student_id": student_id
        })
        
        # Calculate attendance rate
        present_count = await db.attendance_records.count_documents({
            "student_id": student_id,
            "status": "present"
        })
        
        attendance_rate = (present_count / attendance_count * 100) if attendance_count > 0 else 0
        
        stats = {
            "student_id": student_id,
            "enrolled_courses": enrollments_count,
            "total_sessions": attendance_count,
            "present_count": present_count,
            "attendance_rate": round(attendance_rate, 2),
            "student_name": student.get("name", "")
        }
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching student stats: {str(e)}")
