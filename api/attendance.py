from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from typing import Optional
from models.schemas import (
    AttendanceSessionCreate, 
    AttendanceSessionResponse,
    AttendanceUpload,
    CommandRequest
)
from models.database import get_database
from mqtt.client import get_mqtt_client
from api.auth import get_current_user
from datetime import datetime
from bson import ObjectId
import uuid
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/session/start", response_model=AttendanceSessionResponse)
async def start_attendance_session(
    session_data: AttendanceSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new attendance session for a specific course
    
    Validates:
    - Teacher is assigned to the course
    - Classroom is assigned to the course
    - Creates session record and sends MQTT command to Pi device
    """
    db = get_database()
    mqtt = get_mqtt_client()
    
    try:
        # Verify teacher has permission
        if current_user.get("role") != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only teachers can start attendance sessions"
            )
        
        teacher_id = current_user.get("teacher_id")
        if not teacher_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Teacher ID not found in user profile"
            )
        
        # Verify course exists and teacher is assigned
        try:
            course = await db.courses.find_one({"_id": ObjectId(session_data.course_id)})
        except:
            course = await db.courses.find_one({"course_code": session_data.course_id})
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )
        
        if course.get("teacher_id") != teacher_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to teach this course"
            )
        
        # Verify classroom is assigned to this course
        if session_data.classroom_id not in course.get("classroom_ids", []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This classroom is not assigned to the selected course"
            )
        
        # Verify classroom exists
        classroom = await db.classrooms.find_one({"classroom_id": session_data.classroom_id})
        if not classroom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Classroom not found"
            )
        
        # Check if there's already an active session for this course/classroom
        existing_session = await db.attendance_sessions.find_one({
            "course_id": str(course["_id"]),
            "classroom_id": session_data.classroom_id,
            "status": "active"
        })
        
        if existing_session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="There is already an active session for this course in this classroom"
            )
        
        # Generate session ID
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        
        # Get enrolled students for this course
        enrollments = await db.enrollments.find({"course_id": str(course["_id"])}).to_list(1000)
        enrolled_student_ids = [e["student_id"] for e in enrollments]
        
        # Create session document
        session_doc = {
            "session_id": session_id,
            "course_id": str(course["_id"]),
            "course_title": course.get("title"),
            "classroom_id": session_data.classroom_id,
            "session_name": session_data.session_name or f"{course.get('title')} - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            "started_by": teacher_id,
            "teacher_name": current_user.get("name"),
            "started_at": datetime.utcnow(),
            "ended_at": None,
            "status": "active",
            "total_captures": 0,
            "recognized_students": [],
            "enrolled_students": enrolled_student_ids,
            "present_count": 0,
            "absent_count": len(enrolled_student_ids)
        }
        
        # Insert session
        result = await db.attendance_sessions.insert_one(session_doc)
        logger.info(f"Created attendance session {session_id} for course {course.get('course_code')} in classroom {session_data.classroom_id}")
        
        # Send MQTT command to start session
        mqtt.publish_command(
            session_data.classroom_id,
            "start_session",
            {
                "session_id": session_id,
                "course_id": str(course["_id"]),
                "session_name": session_doc["session_name"]
            }
        )
        
        return AttendanceSessionResponse(
            session_id=session_doc["session_id"],
            course_id=session_doc["course_id"],
            course_title=session_doc["course_title"],
            classroom_id=session_doc["classroom_id"],
            session_name=session_doc["session_name"],
            started_by=session_doc["started_by"],
            teacher_name=session_doc["teacher_name"],
            started_at=session_doc["started_at"],
            ended_at=session_doc["ended_at"],
            status=session_doc["status"],
            total_captures=session_doc["total_captures"],
            recognized_students=session_doc["recognized_students"],
            present_count=session_doc["present_count"],
            absent_count=session_doc["absent_count"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start attendance session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start attendance session: {str(e)}")


@router.post("/session/{session_id}/end")
async def end_attendance_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    End an active attendance session
    
    - Validates teacher permission
    - Updates session status to completed
    - Calculates final attendance summary
    - Sends MQTT command to Pi device to stop capturing
    """
    db = get_database()
    mqtt = get_mqtt_client()
    
    try:
        # Find session
        session = await db.attendance_sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session["status"] != "active":
            raise HTTPException(status_code=400, detail="Session is not active")
        
        # Verify teacher permission
        if current_user.get("role") == "teacher":
            teacher_id = current_user.get("teacher_id")
            if session.get("started_by") != teacher_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only end sessions you started"
                )
        elif current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the teacher who started the session or an admin can end it"
            )
        
        # Calculate final attendance summary
        recognized_students = list(set(session.get("recognized_students", [])))
        enrolled_students = session.get("enrolled_students", [])
        
        present_students = [s for s in recognized_students if s in enrolled_students]
        absent_students = [s for s in enrolled_students if s not in recognized_students]
        
        # Update session
        update_result = await db.attendance_sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "ended_at": datetime.utcnow(),
                    "status": "completed",
                    "present_count": len(present_students),
                    "absent_count": len(absent_students),
                    "final_summary": {
                        "present": present_students,
                        "absent": absent_students,
                        "total_enrolled": len(enrolled_students)
                    }
                }
            }
        )
        
        if update_result.modified_count > 0:
            logger.info(f"Ended attendance session {session_id}")
            
            # Send MQTT command to end session
            mqtt.publish_command(
                session["classroom_id"],
                "end_session",
                {"session_id": session_id}
            )
            
            # Get updated session
            updated_session = await db.attendance_sessions.find_one({"session_id": session_id})
            
            return {
                "message": "Session ended successfully",
                "session_id": session_id,
                "ended_at": updated_session["ended_at"],
                "total_captures": updated_session["total_captures"],
                "present_count": len(present_students),
                "absent_count": len(absent_students),
                "total_recognized_students": len(updated_session["recognized_students"])
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update session")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end attendance session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to end attendance session: {str(e)}")


@router.post("/upload_results")
async def upload_attendance_results(
    session_id: str = Form(...),
    classroom_id: str = Form(...),
    device_id: str = Form(...),
    timestamp: str = Form(...),
    recognized_faces: str = Form(...),
    unknown_faces_count: int = Form(0),
    unknown_face_images: list[UploadFile] = File(None),
    db=Depends(get_database)
):
    """
    Upload attendance results from Pi device
    
    - Accepts recognized faces data and unknown face images
    - Updates attendance records in database
    - Links results to active session
    """
    try:
        # Verify session exists
        session = await db.attendance_sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Parse recognized faces JSON
        try:
            recognized_faces_data = json.loads(recognized_faces)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid recognized_faces JSON format")
        
        # Parse timestamp
        try:
            capture_timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            capture_timestamp = datetime.utcnow()
        
        # Store attendance records
        attendance_records = []
        recognized_student_ids = set(session.get("recognized_students", []))
        
        for face_data in recognized_faces_data:
            student_id = face_data.get("student_id")
            
            if student_id:
                # Add to recognized students set
                recognized_student_ids.add(student_id)
                
                # Create attendance record
                record_doc = {
                    "session_id": session_id,
                    "classroom_id": classroom_id,
                    "device_id": device_id,
                    "student_id": student_id,
                    "student_name": face_data.get("student_name", ""),
                    "timestamp": capture_timestamp,
                    "confidence": face_data.get("confidence", 0.0),
                    "created_at": datetime.utcnow()
                }
                attendance_records.append(record_doc)
        
        # Insert attendance records
        if attendance_records:
            await db.attendance_records.insert_many(attendance_records)
            logger.info(f"Inserted {len(attendance_records)} attendance records for session {session_id}")
        
        # Update session statistics
        await db.attendance_sessions.update_one(
            {"session_id": session_id},
            {
                "$inc": {"total_captures": 1},
                "$set": {"recognized_students": list(recognized_student_ids)}
            }
        )
        
        # Handle unknown face images (optional enhancement for future use)
        if unknown_face_images:
            logger.info(f"Received {len(unknown_face_images)} unknown face image(s)")
            # Store for admin review or further processing
        
        return {
            "message": "Attendance results uploaded successfully",
            "session_id": session_id,
            "recognized_count": len(attendance_records),
            "unknown_count": unknown_faces_count,
            "total_recognized_students": len(recognized_student_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload attendance results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload attendance results: {str(e)}")


@router.get("/sessions")
async def get_sessions(
    teacher_id: Optional[str] = None,
    classroom_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    db=Depends(get_database)
):
    """
    Get list of attendance sessions with optional filters
    
    Args:
        teacher_id: Filter by teacher who started the session
        classroom_id: Filter by classroom
        status: Filter by status (active, completed, etc.)
        limit: Maximum number of sessions to return
    """
    try:
        # Build query filter
        query = {}
        
        if teacher_id:
            query["started_by"] = teacher_id
        
        if classroom_id:
            query["classroom_id"] = classroom_id
        
        if status:
            query["status"] = status
        
        # Fetch sessions
        sessions = []
        cursor = db.attendance_sessions.find(query).sort("started_at", -1).limit(limit)
        
        async for session in cursor:
            sessions.append(AttendanceSessionResponse(
                session_id=session["session_id"],
                classroom_id=session["classroom_id"],
                session_name=session["session_name"],
                started_by=session["started_by"],
                started_at=session["started_at"],
                ended_at=session.get("ended_at"),
                status=session["status"],
                total_captures=session["total_captures"],
                recognized_students=session["recognized_students"]
            ))
        
        return {
            "sessions": sessions,
            "total": len(sessions),
            "filters": {
                "teacher_id": teacher_id,
                "classroom_id": classroom_id,
                "status": status
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")


@router.get("/session/{session_id}")
async def get_session_details(session_id: str, db=Depends(get_database)):
    """Get detailed information about a session"""
    try:
        session = await db.attendance_sessions.find_one({"session_id": session_id})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get attendance records
        records = []
        cursor = db.attendance_records.find({"session_id": session_id}).sort("timestamp", 1)
        
        async for record in cursor:
            records.append({
                "student_id": record["student_id"],
                "student_name": record["student_name"],
                "timestamp": record["timestamp"].isoformat(),
                "confidence": record["confidence"]
            })
        
        return {
            "session": AttendanceSessionResponse(
                session_id=session["session_id"],
                classroom_id=session["classroom_id"],
                session_name=session["session_name"],
                started_by=session["started_by"],
                started_at=session["started_at"],
                ended_at=session.get("ended_at"),
                status=session["status"],
                total_captures=session["total_captures"],
                recognized_students=session["recognized_students"]
            ),
            "attendance_records": records,
            "total_records": len(records)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve session details: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve session details")


@router.post("/command")
async def send_command(
    command_data: CommandRequest,
    mqtt=Depends(get_mqtt_client)
):
    """
    Send a command to Pi device
    
    - Supports: capture_now, sync_embeddings, start_stream, stop_stream
    - start_session and end_session should use dedicated endpoints
    """
    try:
        valid_commands = ["capture_now", "sync_embeddings", "start_stream", "stop_stream"]
        
        if command_data.command not in valid_commands:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid command. Allowed: {', '.join(valid_commands)}"
            )
        
        # Send MQTT command
        success = mqtt.publish_command(
            command_data.classroom_id,
            command_data.command,
            command_data.parameters
        )
        
        if success:
            return {
                "message": f"Command '{command_data.command}' sent successfully",
                "classroom_id": command_data.classroom_id,
                "command": command_data.command
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send command via MQTT")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send command: {e}")
        raise HTTPException(status_code=500, detail="Failed to send command")
