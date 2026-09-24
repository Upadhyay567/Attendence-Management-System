import sys
import json
from zk import ZK, const

def run_command():
    cmd = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ['snapshot', 'test', 'users', 'logs'] else 'snapshot'
    start_arg = 2 if cmd in ['snapshot', 'test', 'users', 'logs'] and len(sys.argv) > 1 and sys.argv[1] == cmd else 1

    ip = sys.argv[start_arg] if len(sys.argv) > start_arg else '192.168.1.51'
    port = int(sys.argv[start_arg + 1]) if len(sys.argv) > start_arg + 1 else 4370
    pw = int(sys.argv[start_arg + 2]) if len(sys.argv) > start_arg + 2 else 0
    timeout = int(sys.argv[start_arg + 3]) if len(sys.argv) > start_arg + 3 else 4

    zk = ZK(ip, port=port, timeout=timeout, password=pw, force_udp=False, verbose=False)
    conn = None
    try:
        conn = zk.connect()
        info = {
            "firmware": str(conn.get_firmware_version() or ''),
            "serialNumber": str(conn.get_serialnumber() or ''),
            "deviceName": str(conn.get_device_name() or '')
        }

        users = []
        if cmd in ['snapshot', 'users']:
            users_raw = conn.get_users()
            for u in users_raw:
                users.append({
                    "uid": u.uid,
                    "userId": str(u.user_id),
                    "name": u.name or '',
                    "privilege": u.privilege,
                    "card": getattr(u, 'card', 0)
                })

        logs = []
        if cmd in ['snapshot', 'logs']:
            attendances_raw = conn.get_attendance()
            from datetime import datetime, timedelta
            cutoff = datetime.now() - timedelta(days=45)
            for att in attendances_raw:
                if len(attendances_raw) > 500 and att.timestamp < cutoff:
                    continue
                ts = att.timestamp.strftime('%Y-%m-%d %H:%M:%S')
                logs.append({
                    "userSn": getattr(att, 'uid', None),
                    "deviceUserId": str(att.user_id),
                    "userId": str(att.user_id),
                    "recordTime": ts,
                    "status": att.status,
                    "punch": att.punch
                })

        result = {
            "success": True,
            "ip": ip,
            "port": port,
            "deviceName": info["deviceName"],
            "serialNumber": info["serialNumber"],
            "firmware": info["firmware"],
            "users": users,
            "logs": logs
        }
        print(json.dumps(result))
        return 0
    except Exception as e:
        err_res = {
            "success": False,
            "error": str(e),
            "ip": ip,
            "port": port
        }
        print(json.dumps(err_res))
        return 1
    finally:
        if conn:
            try:
                conn.disconnect()
            except:
                pass

if __name__ == '__main__':
    sys.exit(run_command())
