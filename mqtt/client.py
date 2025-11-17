import paho.mqtt.client as mqtt
import json
import logging
from config import get_settings
from typing import Callable, Optional

logger = logging.getLogger(__name__)
settings = get_settings()


class MQTTClient:
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.connected = False
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker successfully")
        else:
            logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        if rc != 0:
            logger.warning(f"Unexpected disconnection from MQTT broker. Return code: {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client = mqtt.Client()
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
            
            # Set authentication if provided
            if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
                self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
            
            self.client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, 60)
            self.client.loop_start()
            
            logger.info(f"Connecting to MQTT broker at {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("MQTT client disconnected")
    
    def publish_command(self, classroom_id: str, command: str, parameters: dict = None):
        """
        Publish a command to a specific classroom
        
        Args:
            classroom_id: The classroom identifier
            command: Command type (start_session, capture_now, end_session, sync_embeddings)
            parameters: Additional command parameters
        """
        if not self.connected:
            logger.error("MQTT client is not connected")
            return False
        
        topic = f"attendance/{classroom_id}/cmd"
        payload = {
            "command": command,
            "parameters": parameters or {},
            "timestamp": None  # Will be set by JSON encoder
        }
        
        try:
            # Convert payload to JSON
            message = json.dumps(payload, default=str)
            
            # Publish message
            result = self.client.publish(topic, message, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Published command '{command}' to {topic}")
                return True
            else:
                logger.error(f"Failed to publish command. Error code: {result.rc}")
                return False
        except Exception as e:
            logger.error(f"Error publishing command: {e}")
            return False
    
    def publish_embedding_sync(self, classroom_id: str, student_ids: list = None):
        """
        Publish embedding sync notification to a classroom
        
        Args:
            classroom_id: The classroom identifier
            student_ids: List of student IDs that were updated (optional)
        """
        parameters = {}
        if student_ids:
            parameters["updated_students"] = student_ids
        
        return self.publish_command(classroom_id, "sync_embeddings", parameters)


# Global MQTT client instance
mqtt_client = MQTTClient()


def get_mqtt_client() -> MQTTClient:
    """Get the global MQTT client instance"""
    return mqtt_client
