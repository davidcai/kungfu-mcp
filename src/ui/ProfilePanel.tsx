import type { ProfileState } from "./types";

export function ProfilePanel({ profile }: { profile: ProfileState }) {
  if (profile.state === "loading") {
    return <div className="profile">Loading profile…</div>;
  }
  if (profile.state === "error") {
    return <div className="profile err">Failed: {profile.message}</div>;
  }
  return (
    <div className="profile">
      <h4>{profile.name} — Profile</h4>
      {profile.text}
    </div>
  );
}
