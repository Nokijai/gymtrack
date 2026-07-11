"""
GymTrack Authorization Test Suite
Tests for cross-user access control and admin permissions
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.auth import hash_password
from app.database import User, WorkoutSession, Exercise

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables and test users before each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test users
    user_a = User(username="alice", hashed_password=hash_password("password123"))
    user_b = User(username="bob", hashed_password=hash_password("password123"))
    admin_user = User(username="admin", hashed_password=hash_password("admin123"), is_admin=True)
    
    db.add(user_a)
    db.add(user_b)
    db.add(admin_user)
    db.commit()
    
    yield
    
    Base.metadata.drop_all(bind=engine)


def get_auth_token(username: str, password: str):
    """Helper to get JWT token"""
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    return response.json()["access_token"]


class TestCrossUserAccess:
    """Test that users cannot access each other's data"""
    
    def test_user_cannot_view_others_sessions(self):
        """User A cannot view User B's sessions"""
        # Create session for User B
        token_b = get_auth_token("bob", "password123")
        session_response = client.post(
            "/api/sessions",
            json={
                "date": "2026-07-11",
                "duration_minutes": 60,
                "exercises": []
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        session_id = session_response.json()["id"]
        
        # User A tries to view User B's session
        token_a = get_auth_token("alice", "password123")
        response = client.get(
            f"/api/sessions/{session_id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        
        assert response.status_code == 404  # Not found (access denied)
    
    def test_user_cannot_edit_others_sessions(self):
        """User A cannot edit User B's sessions"""
        # Create session for User B
        token_b = get_auth_token("bob", "password123")
        session_response = client.post(
            "/api/sessions",
            json={
                "date": "2026-07-11",
                "duration_minutes": 60,
                "exercises": []
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        session_id = session_response.json()["id"]
        
        # User A tries to edit User B's session
        token_a = get_auth_token("alice", "password123")
        response = client.patch(
            f"/api/sessions/{session_id}",
            json={
                "date": "2026-07-11",
                "duration_minutes": 120,
                "exercises": []
            },
            headers={"Authorization": f"Bearer {token_a}"}
        )
        
        assert response.status_code == 404  # Not found (access denied)
    
    def test_user_cannot_delete_others_sessions(self):
        """User A cannot delete User B's sessions"""
        # Create session for User B
        token_b = get_auth_token("bob", "password123")
        session_response = client.post(
            "/api/sessions",
            json={
                "date": "2026-07-11",
                "duration_minutes": 60,
                "exercises": []
            },
            headers={"Authorization": f"Bearer {token_b}"}
        )
        session_id = session_response.json()["id"]
        
        # User A tries to delete User B's session
        token_a = get_auth_token("alice", "password123")
        response = client.delete(
            f"/api/sessions/{session_id}",
            headers={"Authorization": f"Bearer {token_a}"}
        )
        
        assert response.status_code == 404  # Not found (access denied)


class TestAdminEndpoints:
    """Test that admin endpoints are protected"""
    
    def test_normal_user_cannot_access_admin_users(self):
        """Regular users cannot access admin user list"""
        token = get_auth_token("alice", "password123")
        response = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403  # Forbidden
    
    def test_admin_can_access_admin_users(self):
        """Admin can access admin user list"""
        token = get_auth_token("admin", "admin123")
        response = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
    
    def test_normal_user_cannot_create_user(self):
        """Regular users cannot create other users"""
        token = get_auth_token("alice", "password123")
        response = client.post(
            "/api/admin/users",
            json={"username": "newuser", "password": "password"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403  # Forbidden
    
    def test_normal_user_cannot_override_xp(self):
        """Regular users cannot manually change XP"""
        # Get User B's ID
        db = TestingSessionLocal()
        user_b = db.query(User).filter(User.username == "bob").first()
        user_b_id = user_b.id
        db.close()
        
        token = get_auth_token("alice", "password123")
        response = client.put(
            f"/api/admin/users/{user_b_id}/xp",
            json={"xp": 10000},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403  # Forbidden


class TestAuthSecurity:
    """Test authentication security"""
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials return 401"""
        response = client.post(
            "/api/auth/login",
            json={"username": "alice", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
    
    def test_missing_token_rejected(self):
        """Requests without token are rejected"""
        response = client.get("/api/sessions")
        
        assert response.status_code == 401
    
    def test_invalid_token_rejected(self):
        """Invalid token is rejected"""
        response = client.get(
            "/api/sessions",
            headers={"Authorization": "Bearer invalidtoken"}
        )
        
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])