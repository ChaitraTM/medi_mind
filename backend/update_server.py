import re

with open("server.py", "r") as f:
    content = f.read()

# Add imports
content = content.replace(
    "from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException",
    "from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Depends\nfrom fastapi.security import OAuth2PasswordRequestForm\nfrom auth import get_current_user, require_role, create_access_token, verify_password, get_password_hash\nfrom db import users"
)

# Add Auth schemas
schemas_addition = """
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "USER"

class Token(BaseModel):
    access_token: str
    token_type: str
"""
content = content.replace("# ------------- Helpers -------------", schemas_addition + "\n\n# ------------- Helpers -------------")

# Add auth routes
auth_routes = """
# ------------- Auth -------------
@api.post("/auth/register")
async def register(user: UserCreate):
    existing = await users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "id": new_id(),
        "username": user.username,
        "hashed_password": hashed_password,
        "role": user.role,
        "created_at": now_iso()
    }
    await users.insert_one(user_doc)
    return {"message": "User registered successfully"}

@api.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api.get("/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"], "role": current_user["role"]}

"""
content = content.replace("# ------------- Health / Config -------------", auth_routes + "# ------------- Health / Config -------------")

# Add Depends to endpoints
def add_depends(pattern, dependency):
    global content
    content = re.sub(
        r'(@api\.(get|post|delete)\("([^"]+)"\)\nasync def [a-zA-Z0-9_]+\([^)]*)(\):)',
        lambda m: f"{m.group(1)}{', ' if not m.group(1).endswith('(') else ''}current_user: dict = Depends({dependency}){m.group(4)}",
        content
    )

# For reviews and analytics we need different ones
# Let's do it manually with regex for specific endpoints
replacements = [
    # Dashboard and Analytics -> Admin only
    (r'(@api\.get\("/analytics"\)\nasync def analytics\()(\):)', r'\1current_user: dict = Depends(require_role(["ADMINISTRATOR"]))\2'),
    (r'(@api\.get\("/dashboard"\)\nasync def dashboard\()(\):)', r'\1current_user: dict = Depends(require_role(["ADMINISTRATOR"]))\2'),
    
    # Reviews -> Clinician / Admin
    (r'(@api\.get\("/reviews"\)\nasync def list_reviews\()(\):)', r'\1current_user: dict = Depends(require_role(["CLINICIAN", "ADMINISTRATOR"]))\2'),
    (r'(@api\.post\("/reviews/\{review_id\}/approve"\)\nasync def approve_review\(review_id: str, req: ReviewActionRequest = ReviewActionRequest\(\))(\):)', r'\1, current_user: dict = Depends(require_role(["CLINICIAN", "ADMINISTRATOR"]))\2'),
    (r'(@api\.post\("/reviews/\{review_id\}/reject"\)\nasync def reject_review\(review_id: str, req: ReviewActionRequest = ReviewActionRequest\(\))(\):)', r'\1, current_user: dict = Depends(require_role(["CLINICIAN", "ADMINISTRATOR"]))\2'),
    (r'(@api\.post\("/reviews/\{review_id\}/second-review"\)\nasync def second_review\(review_id: str, req: ReviewActionRequest = ReviewActionRequest\(\))(\):)', r'\1, current_user: dict = Depends(require_role(["CLINICIAN", "ADMINISTRATOR"]))\2'),
    
    # Documents
    (r'(@api\.post\("/documents/upload"\)\nasync def upload_document\(file: UploadFile = File\(\.\.\))(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.get\("/documents"\)\nasync def list_documents\()(\):)', r'\1current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.delete\("/documents/\{doc_id\}"\)\nasync def delete_document\(doc_id: str)(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.post\("/documents/\{doc_id\}/query"\)\nasync def query_document\(doc_id: str, req: WebSearchRequest)(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    
    # Chat and web search
    (r'(@api\.post\("/chat"\)\nasync def chat\(req: ChatRequest)(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.post\("/web-search"\)\nasync def web_search_endpoint\(req: WebSearchRequest)(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    
    # Imaging
    (r'(@api\.post\("/imaging/chest-xray"\)\nasync def imaging_chest\(file: UploadFile = File\(\.\.\))(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.post\("/imaging/skin-lesion"\)\nasync def imaging_skin\(file: UploadFile = File\(\.\.\))(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.post\("/imaging/brain-tumor"\)\nasync def imaging_brain\(file: UploadFile = File\(\.\.\))(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    
    # Conversations
    (r'(@api\.get\("/conversations"\)\nasync def list_conversations\()(\):)', r'\1current_user: dict = Depends(get_current_user)\2'),
    
    # Voice
    (r'(@api\.post\("/voice/transcribe"\)\nasync def voice_transcribe\(file: UploadFile = File\(\.\.\))(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
    (r'(@api\.post\("/voice/speak"\)\nasync def voice_speak\(req: SpeakRequest)(\):)', r'\1, current_user: dict = Depends(get_current_user)\2'),
]

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

with open("server.py", "w") as f:
    f.write(content)

print("Updated server.py successfully.")
