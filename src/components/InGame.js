import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Avatar, Skeleton, message, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

/** 后端接口地址 */
const API_URL = 'http://localhost:8080/current/match/details';

/** Riot ID 复制 */
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
};

/** 图片数据转 URL：支持 dataURL/http/base64/ArrayBuffer/Int8Array/[-128,127] 数组 */
const getImageUrl = (imageData) => {
  if (!imageData) return '';
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image')) return imageData;
    if (imageData.startsWith('http')) return imageData;
    if (/^[A-Za-z0-9+/=]+$/.test(imageData.slice(0, 50))) return `data:image/png;base64,${imageData}`;
    return imageData;
  }
  let u8;
  if (imageData instanceof Uint8Array) u8 = imageData;
  else if (imageData instanceof ArrayBuffer) u8 = new Uint8Array(imageData);
  else if (Array.isArray(imageData)) u8 = new Uint8Array(imageData.map((n) => (n < 0 ? n + 256 : n)));
  else return '';

  const sig = u8.slice(0, 12);
  const isPNG = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  const isJPG = sig[0] === 0xff && sig[1] === 0xd8;
  const isGIF = sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46;
  const isWEBP = sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 && sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50;
  const mime = isJPG ? 'image/jpeg' : isGIF ? 'image/gif' : isWEBP ? 'image/webp' : isPNG ? 'image/png' : 'image/png';
  return URL.createObjectURL(new Blob([u8], { type: mime }));
};

/** 角色顺序：上、打野、中、AD、辅 */
const ROLE_ORDER = { TOP: 0, JUNGLE: 1, MIDDLE: 2, BOTTOM: 3, ADC: 3, CARRY: 3, UTILITY: 4, SUPPORT: 4 };
const roleIndex = (pos) => (pos && ROLE_ORDER[pos.toUpperCase()] !== undefined ? ROLE_ORDER[pos.toUpperCase()] : 99);

/** 从一局 Game 中提取该玩家的 KDA（优先按 puuid；否则用 gameName#tagLine；再不行兜底第 1 位） */
const extractKdaForPlayer = (game, { puuid, gameName, tagLine }) => {
  if (!game) return null;

  const identities = game.participantIdentities || [];
  const participants = game.participants || [];

  // 1) puuid 匹配
  let pid = null;
  if (puuid) {
    const hit = identities.find((pi) => pi?.player?.puuid && pi.player.puuid === puuid);
    if (hit) pid = hit.participantId;
  }
  // 2) Riot ID 匹配
  if (!pid && (gameName || tagLine)) {
    const hit = identities.find(
        (pi) =>
            pi?.player &&
            ((gameName && pi.player.gameName === gameName) ||
                (pi.player.summonerName && pi.player.summonerName === gameName)) &&
            (tagLine ? pi.player.tagLine === tagLine : true)
    );
    if (hit) pid = hit.participantId;
  }
  // 3) 兜底：第一个参与者
  if (!pid && participants.length) pid = participants[0].participantId;

  const me = participants.find((p) => p.participantId === pid);
  const st = me?.stats || {};
  if (me) {
    return {
      kills: st.kills ?? 0,
      deaths: st.deaths ?? 0,
      assists: st.assists ?? 0,
      win: !!st.win,
      championId: me.championId,
    };
  }
  return null;
};

/** 把一队玩家按固定顺序排列，并补齐 5 位 */
const orderAndPad = (players) => {
  const arr = [...players].sort((a, b) => roleIndex(a.position) - roleIndex(b.position));
  while (arr.length < 5) arr.push(null);
  return arr.slice(0, 5);
};

const SlotSkeleton = ({ tone = 'blue' }) => {
  const bg = tone === 'blue' ? 'rgba(24,144,255,0.12)' : 'rgba(255,77,79,0.12)';
  const br = tone === 'blue' ? 'rgba(24,144,255,0.35)' : 'rgba(255,77,79,0.35)';
  return (
      <div style={{ background: bg, border: `1px solid ${br}`, borderRadius: 8, padding: 12, height: 280 }}>
        <Skeleton.Avatar active shape="circle" size={48} />
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 6 }} title={{ width: '60%' }} />
        </div>
      </div>
  );
};

const PlayerCard = ({ data, tone = 'blue' }) => {
  if (!data) return <SlotSkeleton tone={tone} />;

  const riotId = [data.gameName, data.tagLine].filter(Boolean).join('#');
  const champUrl = getImageUrl(data.championPicture);
  const sp1 = getImageUrl(data.spell1Picture);
  const sp2 = getImageUrl(data.spell2Picture);

  // 最近 8 场 KDA
  const history = (data.game || []).slice(0, 8).map((g) => extractKdaForPlayer(g, data));

  const bg = tone === 'blue' ? 'rgba(24,144,255,0.10)' : 'rgba(255,77,79,0.10)';
  const br = tone === 'blue' ? 'rgba(24,144,255,0.30)' : 'rgba(255,77,79,0.30)';

  return (
      <div style={{ background: bg, border: `1px solid ${br}`, borderRadius: 8, padding: 12, height: 280, display: 'flex', flexDirection: 'column' }}>
        {/* 头像 + 名字 + 复制 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <Avatar size={48} src={champUrl || undefined} />
          <div style={{ marginLeft: 10, minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={riotId}>
              {riotId || '未知玩家'}
              {riotId && (
                  <Tooltip title="复制 Riot ID">
                    <CopyOutlined style={{ marginLeft: 6 }} onClick={() => copyText(riotId)} />
                  </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{data.position || '-'}</div>
          </div>
          {/* 召唤师技能 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {sp1 ? <Avatar size={22} shape="square" src={sp1} /> : <Skeleton.Avatar size={22} shape="square" active />}
            {sp2 ? <Avatar size={22} shape="square" src={sp2} /> : <Skeleton.Avatar size={22} shape="square" active />}
          </div>
        </div>

        {/* 最近战绩（K/D/A） */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>最近对局</div>
          <div style={{ height: 'calc(100% - 22px)', overflow: 'auto' }}>
            {history.length > 0 ? (
                history.map((h, idx) =>
                    h ? (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.win ? '#52c41a' : '#ff4d4f', marginRight: 8 }} />
                          <span style={{ fontWeight: 600, marginRight: 6 }}>{h.kills}/{h.deaths}/{h.assists}</span>
                          <span style={{ opacity: 0.7 }}>K/D/A</span>
                        </div>
                    ) : (
                        <div key={idx} style={{ marginBottom: 6, opacity: 0.6 }}>--/--/--</div>
                    )
                )
            ) : (
                <div style={{ opacity: 0.6 }}>暂无历史对局</div>
            )}
          </div>
        </div>
      </div>
  );
};

const TeamRow = ({ players, tone = 'blue' }) => {
  const ordered = useMemo(() => orderAndPad(players), [players]);
  return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {ordered.map((p, i) => (
            <div key={i}>
              <PlayerCard data={p} tone={tone} />
            </div>
        ))}
      </div>
  );
};

const CurrentMatchBoard = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(API_URL);
        if (data?.code === 200) {
          setList(Array.isArray(data.data) ? data.data : []);
        } else if (Array.isArray(data)) {
          // 直接就是数组
          setList(data);
        } else {
          message.error('获取对局详情失败');
        }
      } catch {
        message.error('网络错误，无法获取对局详情');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 假设后端按蓝队→红队顺序返回。若不是，请在后端保证顺序或给 VO 增加 teamId。
  const half = Math.ceil(list.length / 2);
  const blueTeam = list.slice(0, 5);                // 蓝队最多 5 个
  const redTeam = list.slice(5, 10);                // 红队最多 5 个
  // 兜底：如果不是 10 人，也能正常铺满
  while (blueTeam.length < 5 && list.length > 5 && blueTeam.length < half) blueTeam.push(null);
  while (redTeam.length < 5) redTeam.push(null);

  return (
      <div style={{ padding: 16, height: '100vh', boxSizing: 'border-box', background: '#0b0f15', overflow: 'auto' }}>
        <Card
            title={<div style={{ color: '#fff', fontWeight: 700 }}>当前对局</div>}
            bordered={false}
            style={{ background: 'transparent' }}
            headStyle={{ background: 'transparent', borderBottom: 'none' }}
            bodyStyle={{ padding: 0 }}
            loading={loading}
        >
          {/* 上方：蓝队 */}
          <div style={{ marginBottom: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>蓝方</div>
          <TeamRow players={blueTeam} tone="blue" />

          {/* 分割留白 */}
          <div style={{ height: 18 }} />

          {/* 下方：红队 */}
          <div style={{ marginBottom: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>红方</div>
          <TeamRow players={redTeam} tone="red" />
        </Card>
      </div>
  );
};

export default CurrentMatchBoard;
