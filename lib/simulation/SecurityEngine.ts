import type { AccessLogEntry } from "../types";

type Role = "VISITOR" | "EMPLOYEE" | "ENGINEER" | "ADMIN";

interface CredentialRecord {
  uid: string;
  role: Role;
  allowedZones: string[];
}

const CREDENTIALS: CredentialRecord[] = [
  { uid: "UID_8472", role: "EMPLOYEE", allowedZones: ["MAIN_ENTRANCE", "OFFICE_FLOOR", "CAFETERIA"] },
  { uid: "UID_1193", role: "VISITOR", allowedZones: ["MAIN_ENTRANCE"] },
  { uid: "UID_5001", role: "ENGINEER", allowedZones: ["MAIN_ENTRANCE", "MECH_PLANT", "SERVER_ROOM", "OFFICE_FLOOR"] },
  { uid: "UID_9000", role: "ADMIN", allowedZones: ["MAIN_ENTRANCE", "MECH_PLANT", "SERVER_ROOM", "OFFICE_FLOOR", "EXECUTIVE"] }
];

const ZONES_TWO_MAN = new Set(["MECH_PLANT", "SERVER_ROOM"]);

const RESTRICTED_FLOORS_BY_ROLE: Record<Role, number[]> = {
  VISITOR: [4, 5, 6, 7, 8, 9],
  EMPLOYEE: [7, 8, 9],
  ENGINEER: [9],
  ADMIN: []
};

export class SecurityEngine {
  private twoManRuleEnabled = true;
  private logs: AccessLogEntry[] = [];

  setTwoManRule(enabled: boolean): void {
    this.twoManRuleEnabled = enabled;
  }

  scanRFID(uid: string, zone: string, secondUid?: string): AccessLogEntry {
    const primary = CREDENTIALS.find((record) => record.uid === uid);
    const role = primary?.role ?? "VISITOR";

    let granted = false;
    let reason = "DENIED_UNKNOWN_UID";

    if (primary) {
      const zoneAllowed = primary.allowedZones.includes(zone);
      if (!zoneAllowed) {
        reason = "DENIED_ZONE_RESTRICTION";
      } else if (this.twoManRuleEnabled && ZONES_TWO_MAN.has(zone)) {
        const secondary = secondUid ? CREDENTIALS.find((record) => record.uid === secondUid) : undefined;
        const secondaryEligible = !!secondary && (secondary.role === "ENGINEER" || secondary.role === "ADMIN");
        if (!secondaryEligible) {
          reason = "DENIED_TWO_MAN_RULE";
        } else {
          granted = true;
          reason = "GRANTED_TWO_MAN";
        }
      } else {
        granted = true;
        reason = "GRANTED";
      }
    }

    const entry: AccessLogEntry = {
      timestamp: new Date().toISOString().slice(11, 19),
      uid,
      zone,
      granted,
      reason,
      role
    };

    this.logs.unshift(entry);
    this.logs = this.logs.slice(0, 60);
    return entry;
  }

  getSecurityState() {
    return {
      twoManRule: this.twoManRuleEnabled,
      elevatorRestrictedFloors: [7, 8, 9],
      latestAccessLogs: [...this.logs]
    };
  }

  getElevatorRestrictions(uid: string): number[] {
    const role = CREDENTIALS.find((record) => record.uid === uid)?.role ?? "VISITOR";
    return RESTRICTED_FLOORS_BY_ROLE[role];
  }
}