import { useEffect, useState } from "react";
import {
  MeshNameInput,
  PersonalQR,
  useQRScanner,
  makeScanPayload,
  parseScanPayload,
  useIdentity,
  useModerator,
  ModeratorBadge,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Member = { name: string; parent: string | null; joinedAt: number };

const NAME_KEY = (p: string) => `${p}:displayName`;

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="pyr-screen">
        <h1>pyramid</h1>
        <p className="pyr-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [pasteInput, setPasteInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [, rerender] = useState(0);

  // Layer-1 security: stable Ed25519 identity + 30-min auto-expire moderator
  const identity = useIdentity(config.storagePrefix);
  const moderator = useModerator(room, config.storagePrefix, identity);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  useEffect(() => {
    const m = room.doc.getMap<Member>("members");
    const cb = () => rerender((n) => n + 1);
    m.observe(cb);
    return () => m.unobserve(cb);
  }, [room]);

  const members = room.doc.getMap<Member>("members");

  const joinAsRoot = () => {
    const t = name.trim();
    if (!t) return;
    const existing = members.get(room.peerId);
    members.set(room.peerId, {
      name: t,
      parent: existing?.parent ?? null,
      joinedAt: existing?.joinedAt ?? Date.now(),
    });
  };

  const setParentFromPayload = (text: string) => {
    const parsed = parseScanPayload(text);
    if (!parsed) return false;
    if (parsed.peerId === room.peerId) return false;
    const t = name.trim();
    if (!t) return false;
    members.set(room.peerId, {
      name: t,
      parent: parsed.peerId,
      joinedAt: members.get(room.peerId)?.joinedAt ?? Date.now(),
    });
    return true;
  };

  const scanner = useQRScanner({
    onScan: (r) => {
      if (setParentFromPayload(r.text)) {
        setShowScanner(false);
        scanner.stop();
      }
    },
  });

  const allMembers: Array<Member & { id: string }> = [];
  members.forEach((v, k) => allMembers.push({ ...v, id: k }));
  allMembers.sort((a, b) => a.joinedAt - b.joinedAt);

  const childrenOf = new Map<string, Array<Member & { id: string }>>();
  childrenOf.set("ROOT", []);
  for (const m of allMembers) {
    const key = m.parent ?? "ROOT";
    const list = childrenOf.get(key) ?? [];
    list.push(m);
    childrenOf.set(key, list);
  }

  const countDescendants = (id: string): number => {
    const kids = childrenOf.get(id) ?? [];
    return kids.length + kids.reduce((s, k) => s + countDescendants(k.id), 0);
  };
  const depthOf = (id: string): number => {
    const m = members.get(id);
    if (!m || m.parent == null) return 0;
    return 1 + depthOf(m.parent);
  };

  const me = members.get(room.peerId);
  const myDownline = me ? countDescendants(room.peerId) : 0;
  const myDepth = me ? depthOf(room.peerId) : 0;

  const leaderboard = allMembers
    .map((m) => ({ id: m.id, name: m.name, count: countDescendants(m.id) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const renderTree = (id: string, depth = 0): React.ReactNode => {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return null;
    return (
      <ul className="pyr-tree" style={{ marginLeft: depth ? "1.1rem" : 0 }}>
        {kids.map((k) => (
          <li key={k.id}>
            <span className={`pyr-node ${k.id === room.peerId ? "is-me" : ""}`}>
              {k.name}
              {k.id === room.peerId ? " (you)" : ""}
              <span className="pyr-count"> · {countDescendants(k.id)} below</span>
            </span>
            {renderTree(k.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const myPayload = makeScanPayload(room.roomId, room.peerId, name.trim() || "anon");

  return (
    <div className="pyr-screen">
      <header className="pyr-header">
        <h1>pyramid</h1>
        <p className="pyr-status">
          {allMembers.length} members · {room.peerCount + 1} present
          {me && (
            <>
              {" "}
              · you are at depth {myDepth} with {myDownline} below
            </>
          )}
        </p>
      </header>

      <ModeratorBadge state={moderator} resolveName={(peerId) => members.get(peerId)?.name} />

      <section className="pyr-me">
        <h2 className="pyr-section-title">your QR — show this for someone to scan</h2>
        <MeshNameInput
          value={name}
          onChange={setName}
          placeholder="your name"
          maxLength={48}
          className="pyr-name"
        />
        <div className="pyr-qr-wrap">
          <PersonalQR payload={myPayload} size={200} />
        </div>
        <details className="pyr-payload">
          <summary>or copy this payload</summary>
          <code>{myPayload}</code>
        </details>
        {!me && (
          <button
            type="button"
            className="pyr-root-btn"
            onClick={joinAsRoot}
            disabled={!name.trim()}
          >
            join as root (no recruiter)
          </button>
        )}
      </section>

      <section className="pyr-recruit">
        <h2 className="pyr-section-title">recruited by someone? scan their QR</h2>
        <div className="pyr-recruit-actions">
          <button
            type="button"
            onClick={() => {
              if (showScanner) {
                scanner.stop();
                setShowScanner(false);
              } else {
                setShowScanner(true);
                void scanner.start();
              }
            }}
            disabled={!name.trim()}
          >
            {showScanner ? "✗ stop scanner" : "📷 scan a QR"}
          </button>
        </div>
        {showScanner && (
          <video ref={scanner.videoRef} muted playsInline autoPlay className="pyr-video" />
        )}
        {scanner.error && <p className="pyr-error">⚠ {scanner.error}</p>}
        <form
          className="pyr-paste"
          onSubmit={(e) => {
            e.preventDefault();
            if (setParentFromPayload(pasteInput)) setPasteInput("");
          }}
        >
          <input
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="paste a mesh:// payload"
            aria-label="paste payload"
          />
          <button type="submit" disabled={!name.trim() || !pasteInput.trim()}>
            join via paste
          </button>
        </form>
        {me && me.parent && (
          <p className="pyr-recruited-by">
            ✓ you joined under <strong>{members.get(me.parent)?.name ?? "(unknown)"}</strong>
          </p>
        )}
      </section>

      <section className="pyr-leaderboard">
        <h2 className="pyr-section-title">top recruiters</h2>
        {leaderboard.length === 0 ? (
          <p className="pyr-empty">no members yet</p>
        ) : (
          <ol>
            {leaderboard.map((l) => (
              <li key={l.id} className={l.id === room.peerId ? "is-me" : ""}>
                <strong>{l.name}</strong>
                <span>{l.count} downline</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="pyr-tree-wrap">
        <h2 className="pyr-section-title">tree</h2>
        {allMembers.length === 0 ? (
          <p className="pyr-empty">nobody has joined yet</p>
        ) : (
          renderTree("ROOT")
        )}
      </section>
    </div>
  );
}
