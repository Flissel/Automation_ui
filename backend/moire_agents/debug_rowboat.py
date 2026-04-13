"""Debug Rowboat workspace via CDP."""

import asyncio
import json

import aiohttp


async def main():
    async with aiohttp.ClientSession() as s:
        targets = await (await s.get("http://localhost:9223/json")).json()
        rb = next(
            (
                t
                for t in targets
                if "rowboat" in t.get("title", "").lower()
                or "rowboat" in t.get("url", "").lower()
            ),
            None,
        )
        if not rb:
            print("No Rowboat target")
            print("Available:", [t["title"] for t in targets])
            return
        print("Target:", rb["title"], rb.get("url", "")[:60])

        async with s.ws_connect(rb["webSocketDebuggerUrl"]) as ws:
            await ws.send_str(json.dumps({"id": 1, "method": "Runtime.enable"}))
            await ws.receive()

            # Raw CDP call to check ipc availability
            await ws.send_str(
                json.dumps(
                    {
                        "id": 2,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": "typeof window.ipc",
                            "returnByValue": True,
                        },
                    }
                )
            )
            r = json.loads((await ws.receive()).data)
            print("window.ipc type:", r)

            # Check workspace root directly
            await ws.send_str(
                json.dumps(
                    {
                        "id": 3,
                        "method": "Runtime.evaluate",
                        "params": {
                            "expression": "window.ipc.invoke('workspace:getRoot', null)",
                            "awaitPromise": True,
                            "returnByValue": True,
                        },
                    }
                )
            )
            r3 = json.loads((await ws.receive()).data)
            print("workspace:getRoot full response:", json.dumps(r3, indent=2)[:500])


asyncio.run(main())
