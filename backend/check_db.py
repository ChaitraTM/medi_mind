import asyncio
from db import users
async def main():
    print(await users.find_one({'username': 'admin'}))
asyncio.run(main())
