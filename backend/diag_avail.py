import sys
from app.core.cal_com import get_cal_available_times
from app.database import SessionLocal
from app.core.availability import get_available_slots
from datetime import date

db = SessionLocal()

for d in [date(2026, 4, 10), date(2026, 4, 15), date(2026, 4, 16)]:
    print(f"\n=== {d} ===")
    local_slots, blackout, reason = get_available_slots(db, 1, d, 2.0)
    print("LOCAL_FIRST10:", [t.strftime("%H:%M") for t in sorted(local_slots)[:10]])

    cal_times = get_cal_available_times(d, 120)
    if cal_times is not None:
        sorted_cal = sorted(cal_times)
        print("CAL_FIRST10: ", [t.strftime("%H:%M") for t in sorted_cal[:10]])
        print("CAL_TOTAL:   ", len(cal_times))
        # Show which local slots are missing from cal.com
        cal_set = {t.strftime("%H:%M") for t in cal_times}
        missing = [t.strftime("%H:%M") for t in sorted(local_slots) if t.strftime("%H:%M") not in cal_set]
        print("MISSING_FROM_CAL:", missing[:10])
    else:
        print("CAL_TIMES: None (fallback mode)")
