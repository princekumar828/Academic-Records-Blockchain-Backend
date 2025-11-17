from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


# ===== Course Models =====
class CourseBase(BaseModel):
    course_code: str = Field(..., description="Unique course code (e.g., CSE301)")
    title: str = Field(..., description="Course title")
    year: int = Field(..., description="Academic year")
    class_code: Optional[str] = Field(None, description="Class section (e.g., A, B)")
    department: Optional[str] = None
    description: Optional[str] = None


class CourseCreate(CourseBase):
    teacher_id: str = Field(..., description="Teacher assigned to this course")


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    teacher_id: Optional[str] = None
    year: Optional[int] = None
    class_code: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    classroom_ids: Optional[List[str]] = None


class CourseResponse(CourseBase):
    course_id: str = Field(..., alias="_id")
    teacher_id: str
    teacher_name: Optional[str] = None
    classroom_ids: List[str] = []
    enrolled_students_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ===== Enrollment Models =====
class EnrollmentCreate(BaseModel):
    student_id: str
    course_id: str


class EnrollmentBulkCreate(BaseModel):
    course_id: str
    student_ids: List[str]


class EnrollmentResponse(BaseModel):
    enrollment_id: str = Field(..., alias="_id")
    student_id: str
    course_id: str
    student_name: Optional[str] = None
    course_title: Optional[str] = None
    enrolled_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class StudentBase(BaseModel):
    student_id: str = Field(..., description="Unique student identifier")
    name: str = Field(..., description="Student full name")
    email: Optional[str] = None
    phone: Optional[str] = None
    batch: str = Field(..., description="Batch or year")
    department: Optional[str] = None


class StudentCreate(StudentBase):
    face_images: Optional[List[str]] = Field(default=None, description="Base64 encoded face images (optional)")


class StudentResponse(StudentBase):
    created_at: datetime
    updated_at: datetime
    embeddings_count: int = 0
    
    class Config:
        from_attributes = True
        populate_by_name = True


class EmbeddingResponse(BaseModel):
    student_id: str
    embedding_data: str  # Base64 encoded numpy array
    metadata: dict


class AttendanceSessionCreate(BaseModel):
    course_id: str = Field(..., description="Course ID for this session")
    classroom_id: str = Field(..., description="Classroom/Device ID where session is held")
    session_name: Optional[str] = None
    started_by: str = Field(..., description="Teacher ID")


class AttendanceSessionResponse(BaseModel):
    session_id: str
    course_id: str
    course_title: Optional[str] = None
    classroom_id: str
    session_name: Optional[str] = None
    started_by: str
    teacher_name: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str  # active, completed
    total_captures: int = 0
    recognized_students: List[str] = []
    present_count: int = 0
    absent_count: int = 0


class AttendanceRecord(BaseModel):
    student_id: str
    student_name: str
    timestamp: datetime
    confidence: float


class AttendanceUpload(BaseModel):
    session_id: str
    classroom_id: str
    device_id: str
    timestamp: datetime
    recognized_faces: List[AttendanceRecord]
    unknown_faces_count: int = 0


class CommandRequest(BaseModel):
    classroom_id: str
    command: str  # start_session, capture_now, end_session, sync_embeddings
    parameters: Optional[dict] = None


class EmbeddingSyncRequest(BaseModel):
    classroom_id: Optional[str] = None
    department: Optional[str] = None
    last_sync_timestamp: Optional[datetime] = None


# ===== Teacher Models =====
class TeacherBase(BaseModel):
    teacher_id: str = Field(..., description="Unique teacher identifier")
    name: str
    email: EmailStr
    department: Optional[str] = None
    phone: Optional[str] = None


class TeacherCreate(TeacherBase):
    password: Optional[str] = None  # Optional - will be auto-generated if not provided


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    phone: Optional[str] = None


class TeacherResponse(TeacherBase):
    assigned_courses: List[str] = []
    courses_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ===== Classroom Models =====
class ClassroomBase(BaseModel):
    classroom_id: str = Field(..., description="Unique classroom/device identifier")
    name: str
    building: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    location: Optional[str] = None


class ClassroomCreate(ClassroomBase):
    device_ip: Optional[str] = None


class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    location: Optional[str] = None
    device_ip: Optional[str] = None
    status: Optional[str] = None
    mqtt_connected: Optional[bool] = None
    camera_status: Optional[str] = None


class ClassroomResponse(ClassroomBase):
    device_ip: Optional[str] = None
    status: str = "offline"  # online, offline, idle
    last_seen: Optional[datetime] = None
    mqtt_connected: bool = False
    camera_status: Optional[str] = None  # OK, ERROR, NOT_DETECTED
    courses_count: int = 0
    device_assigned: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
