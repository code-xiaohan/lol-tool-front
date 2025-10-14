import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Avatar, Skeleton, message, Button, Tooltip } from 'antd';
import { CopyOutlined, TrophyOutlined, SyncOutlined } from '@ant-design/icons';

const API_URL = 'http://localhost:8080/player/current/match/details';

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
};

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
  const mime = isJPG ? 'image/jpeg' : isPNG ? 'image/png' : 'image/png';
  return URL.createObjectURL(new Blob([u8], { type: mime }));
};

const ROLE_ORDER = { TOP: 0, JUNGLE: 1, MIDDLE: 2, BOTTOM: 3, ADC: 3, CARRY: 3, UTILITY: 4, SUPPORT: 4 };
const roleIndex = (pos) => {
  if (!pos) return 99;
  const p = pos.toUpperCase();
  return ROLE_ORDER[p] !== undefined ? ROLE_ORDER[p] : 99;
};

const extractKdaForPlayer = (game, { puuid, gameName, tagLine }) => {
  if (!game) return null;
  const identities = game.participantIdentities || [];
  const participants = game.participants || [];
  let pid = null;
  if (puuid) {
    const hit = identities.find((pi) => pi?.player?.puuid === puuid);
    if (hit) pid = hit.participantId;
  }
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
  if (!pid && participants.length) pid = participants[0].participantId;
  const me = participants.find((p) => p.participantId === pid);
  const st = me?.stats || {};
  return me
      ? { kills: st.kills ?? 0, deaths: st.deaths ?? 0, assists: st.assists ?? 0, win: !!st.win }
      : null;
};

const orderAndPad = (players = []) => {
  const valid = players.filter((p) => p && typeof p === 'object');
  const arr = [...valid].sort((a, b) => roleIndex(a?.position) - roleIndex(b?.position));
  while (arr.length < 5) arr.push(null);
  return arr.slice(0, 5);
};

const SlotSkeleton = ({ tone = 'blue' }) => {
  const bg = tone === 'blue' ? 'rgba(230,247,255,0.6)' : 'rgba(255,241,240,0.6)';
  const br = tone === 'blue' ? 'rgba(24,144,255,0.25)' : 'rgba(255,77,79,0.25)';
  return (
      <div style={{ background: bg, border: `1px solid ${br}`, borderRadius: 8, padding: 12, height: 280 }}>
        <Skeleton.Avatar active size={48} />
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
  const history = (data.game || []).slice(0, 8).map((g) => extractKdaForPlayer(g, data));
  const bg = tone === 'blue' ? 'rgba(230,247,255,0.6)' : 'rgba(255,241,240,0.6)';
  const br = tone === 'blue' ? 'rgba(24,144,255,0.25)' : 'rgba(255,77,79,0.25)';

  return (
      <div
          style={{
            background: bg,
            border: `1px solid ${br}`,
            borderRadius: 8,
            padding: 12,
            height: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
      >
        {/* 玩家信息 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <Avatar size={48} src={champUrl || undefined} />
          <div style={{ marginLeft: 10, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>
              {riotId || '未知玩家'}
              {riotId && (
                  <Tooltip title="复制 Riot ID">
                    <CopyOutlined style={{ marginLeft: 6, color: '#1890ff' }} onClick={() => copyText(riotId)} />
                  </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>{data.position || '-'}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {sp1 ? <Avatar size={22} shape="square" src={sp1} /> : <Skeleton.Avatar size={22} shape="square" active />}
            {sp2 ? <Avatar size={22} shape="square" src={sp2} /> : <Skeleton.Avatar size={22} shape="square" active />}
          </div>
        </div>

        {/* 历史战绩 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>最近对局</div>
          <div style={{ height: 'calc(100% - 22px)', overflow: 'auto' }}>
            {history.length > 0 ? (
                history.map((h, idx) =>
                    h ? (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                          <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: h.win ? '#52c41a' : '#ff4d4f',
                                marginRight: 8,
                              }}
                          />
                          <span style={{ fontWeight: 600, color: '#000', marginRight: 6 }}>
                    {h.kills}/{h.deaths}/{h.assists}
                  </span>
                          <span style={{ color: '#888' }}>K/D/A</span>
                        </div>
                    ) : (
                        <div key={idx} style={{ marginBottom: 6, color: '#999' }}>--/--/--</div>
                    )
                )
            ) : (
                <div style={{ color: '#999' }}>暂无历史对局</div>
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
            <PlayerCard key={i} data={p} tone={tone} />
        ))}
      </div>
  );
};

const CurrentMatchBoard = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);

  const fetchCurrentMatch = async () => {
    console.log('准备发起请求:', API_URL);
    setLoading(true);
    try {
      const { data } = await axios.get(API_URL);
      console.log('返回结果:', data);
      if (data?.code === 200) setList(data.data || []);
      else if (Array.isArray(data)) setList(data);
      else message.error('获取对局失败');
    } catch (e) {
      console.error('请求异常:', e);
      message.error('网络错误，无法获取对局信息');
    } finally {
      setLoading(false);
    }
  };

  const blueTeam = list.slice(0, 5);
  const redTeam = list.slice(5, 10);

  return (
      <div style={{ padding: 16, height: '100vh', background: '#fff', boxSizing: 'border-box', overflow: 'auto' }}>
        <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#000', fontWeight: 700 }}>
                  <TrophyOutlined style={{ marginRight: 8, color: '#1890ff' }} /> 当前对局
                </div>
                <Button
                    type="primary"
                    icon={<SyncOutlined spin={loading} />}
                    onClick={fetchCurrentMatch}
                    loading={loading}
                >
                  获取当前对局
                </Button>
              </div>
            }
            bordered={false}
            style={{ background: '#fff' }}
            bodyStyle={{ padding: 0 }}
        >
          {list.length > 0 ? (
              <>
                <div style={{ marginBottom: 12, color: '#1890ff', fontWeight: 700 }}>蓝方</div>
                <TeamRow players={blueTeam} tone="blue" />
                <div style={{ height: 20 }} />
                <div style={{ marginBottom: 12, color: '#ff4d4f', fontWeight: 700 }}>红方</div>
                <TeamRow players={redTeam} tone="red" />
              </>
          ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 60 }}>
                <TrophyOutlined style={{ fontSize: 48, marginBottom: 12, color: '#ccc' }} />
                <div>点击右上角“获取当前对局”按钮开始</div>
              </div>
          )}
        </Card>
      </div>
  );
};

export default CurrentMatchBoard;
