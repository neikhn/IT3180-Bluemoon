from fastapi import APIRouter
from models.account import Account
from typing import List

router = APIRouter()

@router.get("/accounts", response_model=List[Account])
async def get_all_accounts():
    """Lấy danh sách tất cả các accounts"""
    accounts = await Account.find_all().to_list()
    return accounts
