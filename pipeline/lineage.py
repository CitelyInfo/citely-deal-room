"""Northstar capture pipeline — lineage logger (synthetic demo code).

Every trajectory written by the capture rig gets one lineage record with the
four fields a lab's security questionnaire asks for under "data handling":
timestamp, site, device, operator. Records are append-only JSONL.
"""
from __future__ import annotations
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class LineageRecord:
    trajectory_id: str
    timestamp: float      # unix seconds, rig clock (NTP-synced)
    site: str             # site register id, e.g. "site-07-austin-kitchen"
    device: str           # rig serial, e.g. "rig-A113"
    operator: str         # operator id (pseudonymous), e.g. "op-2f91"


class LineageLog:
    def __init__(self, path: Path) -> None:
        self.path = path

    def append(self, rec: LineageRecord) -> None:
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(rec)) + "\n")

    def for_trajectory(self, trajectory_id: str) -> LineageRecord | None:
        with self.path.open(encoding="utf-8") as f:
            for line in f:
                d = json.loads(line)
                if d["trajectory_id"] == trajectory_id:
                    return LineageRecord(**d)
        return None


def record_capture(log: LineageLog, trajectory_id: str, site: str, device: str, operator: str) -> LineageRecord:
    rec = LineageRecord(trajectory_id, time.time(), site, device, operator)
    log.append(rec)
    return rec
