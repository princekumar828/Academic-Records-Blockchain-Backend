"""
Classrooms API endpoints
Provides CRUD operations for classroom management
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from models.database import get_database
from api.auth import get_current_user
from models.schemas import ClassroomCreate, ClassroomUpdate
from mqtt.client import get_mqtt_client
from bson import ObjectId

router = APIRouter(prefix="/api/classrooms", tags=["classrooms"])


@router.get("/", status_code=status.HTTP_200_OK)
async def get_all_classrooms(
    building: Optional[str] = None,
    status_filter: Optional[str] = None
):
    """
    Get all classrooms
    
    Query Parameters:
    - building: Filter by building (optional)
    - status_filter: Filter by status (online/offline/idle) (optional)
    """
    db = get_database()
    
    # Build query
    query = {}
    if building:
        query["building"] = building
    if status_filter:
        query["status"] = status_filter
    
    # Fetch classrooms
    classrooms_cursor = db.classrooms.find(query)
    classrooms = []
    
    async for classroom in classrooms_cursor:
        # Get course count for this classroom
        courses_count = await db.courses.count_documents({
            "classroom_ids": classroom.get("classroom_id")
        })
        
        classrooms.append({
            "classroom_id": classroom.get("classroom_id"),
            "name": classroom.get("name"),
            "building": classroom.get("building"),
            "floor": classroom.get("floor"),
            "location": classroom.get("location"),
            "capacity": classroom.get("capacity"),
            "device_ip": classroom.get("device_ip"),
            "stream_url": f"http://{classroom.get('device_ip')}:8080/video_feed" if classroom.get('device_ip') else None,
            "status": classroom.get("status", "offline"),
            "last_seen": classroom.get("last_seen"),
            "mqtt_connected": classroom.get("mqtt_connected", False),
            "camera_status": classroom.get("camera_status"),
            "courses_count": courses_count,
            "device_assigned": classroom.get("device_assigned", True),
            "created_at": classroom.get("created_at"),
        })
    
    return {"data": classrooms, "count": len(classrooms)}


@router.get("/{classroom_id}", status_code=status.HTTP_200_OK)
async def get_classroom(
    classroom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get classroom by ID
    """
    db = get_database()
    
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found"
        )
    
    # Get assigned courses
    courses_cursor = db.courses.find({"classroom_ids": classroom_id})
    assigned_courses = []
    
    async for course in courses_cursor:
        assigned_courses.append({
            "course_id": str(course["_id"]),
            "course_code": course.get("course_code"),
            "title": course.get("title"),
        })
    
    return {
        "classroom_id": classroom.get("classroom_id"),
        "name": classroom.get("name"),
        "building": classroom.get("building"),
        "floor": classroom.get("floor"),
        "location": classroom.get("location"),
        "capacity": classroom.get("capacity"),
        "device_ip": classroom.get("device_ip"),
        "status": classroom.get("status", "offline"),
        "last_seen": classroom.get("last_seen"),
        "mqtt_connected": classroom.get("mqtt_connected", False),
        "camera_status": classroom.get("camera_status"),
        "assigned_courses": assigned_courses,
        "courses_count": len(assigned_courses),
        "device_assigned": classroom.get("device_assigned", True),
        "created_at": classroom.get("created_at"),
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_classroom(
    classroom: ClassroomCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new classroom/device (Admin only)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create classrooms"
        )
    
    db = get_database()
    
    # Check if classroom_id already exists
    existing = await db.classrooms.find_one({"classroom_id": classroom.classroom_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Classroom with ID {classroom.classroom_id} already exists"
        )
    
    # Create classroom document
    classroom_doc = {
        "classroom_id": classroom.classroom_id,
        "name": classroom.name,
        "building": classroom.building,
        "floor": classroom.floor,
        "location": classroom.location,
        "capacity": classroom.capacity,
        "device_ip": classroom.device_ip,
        "status": "offline",
        "device_assigned": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.classrooms.insert_one(classroom_doc)
    
    return {
        "classroom_id": classroom_doc["classroom_id"],
        "name": classroom_doc["name"],
        "building": classroom_doc["building"],
        "floor": classroom_doc["floor"],
        "location": classroom_doc["location"],
        "capacity": classroom_doc["capacity"],
        "device_ip": classroom_doc["device_ip"],
        "status": classroom_doc["status"],
        "device_assigned": classroom_doc["device_assigned"],
        "courses_count": 0,
        "created_at": classroom_doc["created_at"],
    }


@router.put("/{classroom_id}", status_code=status.HTTP_200_OK)
async def update_classroom(
    classroom_id: str,
    classroom_update: ClassroomUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a classroom (Admin only)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update classrooms"
        )
    
    db = get_database()
    
    # Find classroom
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found"
        )
    
    # Prepare update data
    update_data = {
        k: v for k, v in classroom_update.model_dump(exclude_unset=True).items()
        if v is not None
    }
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update classroom
    await db.classrooms.update_one(
        {"classroom_id": classroom_id},
        {"$set": update_data}
    )
    
    # Get updated classroom
    updated_classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    
    # Get course count
    courses_count = await db.courses.count_documents({
        "classroom_ids": classroom_id
    })
    
    return {
        "classroom_id": updated_classroom.get("classroom_id"),
        "name": updated_classroom.get("name"),
        "building": updated_classroom.get("building"),
        "floor": updated_classroom.get("floor"),
        "location": updated_classroom.get("location"),
        "capacity": updated_classroom.get("capacity"),
        "device_ip": updated_classroom.get("device_ip"),
        "status": updated_classroom.get("status", "offline"),
        "device_assigned": updated_classroom.get("device_assigned", True),
        "courses_count": courses_count,
        "created_at": updated_classroom.get("created_at"),
        "updated_at": updated_classroom.get("updated_at"),
    }


@router.delete("/{classroom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classroom(
    classroom_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a classroom (Admin only)
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete classrooms"
        )
    
    db = get_database()
    
    # Find classroom
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found"
        )
    
    # Check if classroom has assigned courses
    courses_count = await db.courses.count_documents({
        "classroom_ids": classroom_id
    })
    
    if courses_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete classroom with {courses_count} assigned course(s). Please unassign courses first."
        )
    
    # Delete classroom
    result = await db.classrooms.delete_one({"classroom_id": classroom_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete classroom"
        )
    
    return None


@router.post("/{classroom_id}/status", status_code=status.HTTP_200_OK)
async def update_device_status(
    classroom_id: str,
    status_update: dict
):
    """
    Update device status (called by Pi devices)
    
    Body:
    - status: online/offline/idle
    - mqtt_connected: boolean
    - camera_status: OK/ERROR/NOT_DETECTED
    """
    db = get_database()
    
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found"
        )
    
    # Update fields
    update_data = {
        "updated_at": datetime.utcnow(),
        "last_seen": datetime.utcnow()
    }
    
    if "status" in status_update:
        update_data["status"] = status_update["status"]
    
    if "mqtt_connected" in status_update:
        update_data["mqtt_connected"] = status_update["mqtt_connected"]
    
    if "camera_status" in status_update:
        update_data["camera_status"] = status_update["camera_status"]
    
    result = await db.classrooms.update_one(
        {"classroom_id": classroom_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update device status"
        )
    
    return {
        "message": "Device status updated successfully",
        "classroom_id": classroom_id,
        "status": status_update.get("status"),
        "last_seen": update_data["last_seen"]
    }


@router.post("/{classroom_id}/check-status", status_code=status.HTTP_200_OK)
async def check_device_status(
    classroom_id: str,
    current_user: dict = Depends(get_current_user),
    mqtt=Depends(get_mqtt_client)
):
    """
    Request device to report its status (Admin only)
    
    Sends MQTT command to device to report current status.
    Device will respond by calling POST /{classroom_id}/status
    """
    if current_user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and teachers can check device status"
        )
    
    db = get_database()
    
    classroom = await db.classrooms.find_one({"classroom_id": classroom_id})
    
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {classroom_id} not found"
        )
    
    # Send MQTT command to device to report status
    success = mqtt.publish_command(
        classroom_id,
        "report_status",
        {}
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send status check command to device"
        )
    
    return {
        "message": "Status check request sent to device",
        "classroom_id": classroom_id,
        "note": "Device will update status within a few seconds"
    }
