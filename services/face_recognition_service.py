# Backend face recognition utilities for registration workflows.
import base64
import io
import logging
from typing import List, Tuple

import face_recognition
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    def __init__(self, tolerance: float = 0.6, model: str = "hog", num_jitters: int = 1):
        """
        Initialize face recognition service.

        Args:
            tolerance: Distance threshold for matching.
            model: Detection model name supported by face_recognition (hog/cnn).
            num_jitters: Jitter count for encoding stability.
        """
        self.tolerance = tolerance
        self.model = model
        self.num_jitters = num_jitters
        logger.info("FaceRecognitionService ready for backend embedding generation")
    
    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """
        Decode base64 string to image array
        
        Args:
            base64_str: Base64 encoded image string
            
        Returns:
            numpy array of the image in RGB format
        """
        try:
            # Remove data URI prefix if present
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_str)
            
            # Open image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            return np.array(image)
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {e}")
            raise ValueError(f"Invalid image data: {e}")
    
    def generate_embeddings(self, base64_images: List[str]) -> Tuple[List[np.ndarray], List[Tuple[int, int, int, int]]]:
        """
        Generate face embeddings from base64 encoded images.

        Args:
            base64_images: List of base64 encoded images.

        Returns:
            Tuple of (embeddings_list, face_locations_list).
        """
        all_embeddings: List[np.ndarray] = []
        all_locations: List[Tuple[int, int, int, int]] = []

        for idx, base64_img in enumerate(base64_images):
            try:
                image = self.decode_base64_image(base64_img)
                face_locations = face_recognition.face_locations(image, model=self.model)

                if not face_locations:
                    logger.warning("No face detected in registration image %d", idx + 1)
                    continue

                # Select the largest detected face per image for consistency.
                largest_loc = max(
                    face_locations,
                    key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3])
                )

                encodings = face_recognition.face_encodings(
                    image,
                    known_face_locations=[largest_loc],
                    num_jitters=self.num_jitters
                )

                if not encodings:
                    logger.warning("Failed to compute embedding for image %d", idx + 1)
                    continue

                embedding = np.asarray(encodings[0], dtype=np.float32)

                norm = float(np.linalg.norm(embedding))
                if norm > 0:
                    embedding = embedding / norm
                all_embeddings.append(embedding)
                all_locations.append(tuple(int(v) for v in largest_loc))
                logger.info("Generated embedding for registration image %d", idx + 1)

            except Exception as exc:
                logger.error("Error processing registration image %d: %s", idx + 1, exc)
                continue

        return all_embeddings, all_locations
    
    def encode_embedding(self, embedding: np.ndarray) -> str:
        """
        Encode numpy embedding to base64 string
        
        Args:
            embedding: Numpy array of face embedding
            
        Returns:
            Base64 encoded string
        """
        embedding_bytes = np.asarray(embedding, dtype=np.float32).tobytes()
        return base64.b64encode(embedding_bytes).decode('utf-8')
    
    def decode_embedding(self, encoded_embedding: str) -> np.ndarray:
        """
        Decode base64 string to numpy embedding
        
        Args:
            encoded_embedding: Base64 encoded embedding string
            
        Returns:
            Numpy array of face embedding
        """
        embedding_bytes = base64.b64decode(encoded_embedding)

        expected_float32 = 128 * 4
        expected_float64 = 128 * 8

        if len(embedding_bytes) == expected_float32:
            return np.frombuffer(embedding_bytes, dtype=np.float32)
        if len(embedding_bytes) == expected_float64:
            return np.frombuffer(embedding_bytes, dtype=np.float64).astype(np.float32)

        raise ValueError("Unexpected embedding byte length")
    
    def compare_faces(self, known_embeddings: List[np.ndarray], face_embedding: np.ndarray) -> Tuple[List[bool], List[float]]:
        """
        Compare a face embedding against known embeddings
        
        Note: This is a stub. Actual face matching happens on edge devices.
        
        Args:
            known_embeddings: List of known face embeddings
            face_embedding: Face embedding to compare
            
        Returns:
            Tuple of (matches_list, distances_list)
        """
        if not known_embeddings:
            return [], []

        candidates = [np.asarray(emb, dtype=np.float32) for emb in known_embeddings]
        target = np.asarray(face_embedding, dtype=np.float32)

        distances = face_recognition.face_distance(candidates, target)
        matches = [dist <= self.tolerance for dist in distances]

        return matches, distances.tolist()
