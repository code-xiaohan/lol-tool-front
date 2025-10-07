import React, { useState, useEffect } from 'react';
import { Card, Avatar, Button, Alert, Spin, Row, Col, message, Tooltip } from 'antd';
import { UserOutlined, TrophyOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制召唤师名');
  } catch (e) {
    // 兼容较老浏览器
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); message.success('已复制召唤师名'); }
    catch { message.error('复制失败'); }
    finally { document.body.removeChild(ta); }
  }
};

// 统一格式化游戏时间（目前右侧不再展示，但保留以便后续扩展）
function formatGameTime(input) {
  if (input == null) return '-';
  let ts = input;
  if (typeof ts === 'string' && /^\d+$/.test(ts)) ts = Number(ts);
  let date = typeof ts === 'number' ? new Date(ts < 1e12 ? ts * 1000 : ts) : new Date(ts);
  if (isNaN(date.getTime())) return '-';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}年${m}月${d}日 ${hh}:${mm}`;
}

const formatGold = (g) => (g == null ? '0.0k' : `${(Number(g) / 1000).toFixed(1)}k`);
const formatK = (n) => {
  const v = Number(n || 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
};

/** 通用图片转换：支持 dataURL/http/base64/ArrayBuffer/有符号整型数组 */
const getImageUrl = (imageData) => {
  if (!imageData) return 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/0.png';
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
  else return 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/0.png';

  const sig = u8.slice(0, 12);
  const isPNG = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
  const isJPG = sig[0] === 0xff && sig[1] === 0xd8;
  const isGIF = sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46;
  const isWEBP = sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 && sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50;
  const mime = isJPG ? 'image/jpeg' : isGIF ? 'image/gif' : isWEBP ? 'image/webp' : isPNG ? 'image/png' : 'image/png';
  return URL.createObjectURL(new Blob([u8], { type: mime }));
};

const PersonalInfo = () => {
  const [loading, setLoading] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const fetchPlayerInfo = async () => {
    try { await axios.get('http://localhost:8080/player/info'); } catch {}
  };

  const getGameTypeName = (queueId, gameMode) => {
    const map = { 420: '单双排', 430: '匹配模式', 440: '灵活排位', 450: '大乱斗', 700: '冠军杯赛', 830: '入门', 840: '新手', 850: '一般', 1090: '云顶之弈', 1400: '终极魔典', 1700: '斗魂竞技场', 490: '快速模式', 2000: '新手教程1', 2010: '新手教程2', 2020: '新手教程3' };
    if (gameMode === 'CHERRY') return '斗魂竞技场';
    if (gameMode === 'SWIFTPLAY' || gameMode === 'QUICKPLAY') return '快速模式';
    return map[queueId] || gameMode || '未知';
  };

  const fetchMatchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('http://localhost:8080/player/history/currentPlayer/match');
      if (data.code === 200) {
        const games = data?.data?.games?.games || [];
        const formatted = games.map((g) => {
          const p0 = g.participants?.[0] || {};
          const id0 = g.participantIdentities?.[0] || {};
          return {
            gameId: g.gameId,
            champion: p0?.championId || 238,
            championPicture: p0?.championPicture || '',
            gameMode: g.gameMode,
            gameType: getGameTypeName(g.queueId, g.gameMode),
            win: p0?.stats?.win || false,
            gameTime: new Date(g.gameCreation).toISOString(),
            profileIcon: id0?.player?.profileIcon || 0,
            summonerName: id0?.player?.summonerName || id0?.player?.gameName || 'Unknown',
            tagLine: id0?.player?.tagLine || '',
          };
        });
        setMatchHistory(formatted);
        if (formatted.length) handleMatchSelect(formatted[0]);
      } else {
        setAlertMessage('获取对战历史失败！'); setAlertType('error');
      }
    } catch {
      setAlertMessage('获取对战历史失败！请检查网络连接。'); setAlertType('error');
    } finally { setLoading(false); }
  };

  const fetchGameDetail = async (gameId) => {
    setDetailLoading(true);
    try {
      const { data } = await axios.get('http://localhost:8080/player/gameDetail', { params: { gameId } });
      if (data?.code === 200 && data.data) {
        const game = data.data;
        const players = (game.participants || []).map((pt) => {
          const id = (game.participantIdentities || []).find((pi) => pi.participantId === pt.participantId);
          const s = pt.stats || {};

          // 组装 riot 名称
          const gameName = id?.player?.gameName || id?.player?.summonerName || `Player ${pt.participantId}`;
          const tagLine = id?.player?.tagLine || '';
          const riotName = tagLine ? `${gameName}#${tagLine}` : gameName;

          const itemPictures = [s.item0Picture, s.item1Picture, s.item2Picture, s.item3Picture, s.item4Picture, s.item5Picture, s.item6Picture].filter(Boolean);

          return {
            teamId: pt.teamId,
            summonerName: gameName,              // 保留原字段，避免其他地方引用报错
            gameName,
            tagLine,
            riotName,                            // ✅ gameName#tagLine
            champion: pt.championId,
            championPicture: pt.championPicture || '',
            kills: s.kills || 0, deaths: s.deaths || 0, assists: s.assists || 0,
            level: s.champLevel || 1,
            items: [s.item0, s.item1, s.item2, s.item3, s.item4, s.item5, s.item6].filter((x) => x && x !== 0),
            itemPictures,
            spells: [
              { id: pt.spell1Id, picture: pt.spell1Picture },
              { id: pt.spell2Id, picture: pt.spell2Picture }
            ].filter(sp => sp.id),
            goldEarned: s.goldEarned || 0,
            totalDamageDealt: s.totalDamageDealtToChampions || 0, // 字符串也能被 Number() 解析（下方 formatK 已兼容）
            isWin: s.win === true,
          };
        });
        setMatchDetail({
          gameId: game.gameId,
          gameMode: game.gameMode,
          gameDuration: game.gameDuration,
          gameTime: game.gameCreation || game.gameCreationDate,
          queueId: game.queueId,
          players,
        });
      } else setMatchDetail(null);
    } catch { setMatchDetail(null); }
    finally { setDetailLoading(false); }
  };

  const handleMatchSelect = (m) => {
    setSelectedMatch(m);
    if (m?.gameId != null) fetchGameDetail(m.gameId);
    else setMatchDetail(null);
  };

  useEffect(() => { (async () => { await fetchMatchHistory(); try { await fetchPlayerInfo(); } catch {} })(); }, []);

  /** 单行玩家 */
  const renderPlayerRow = (p) => {
    const kda = `${p.kills}/${p.deaths}/${p.assists}`;
    const kdar = p.deaths > 0 ? ((p.kills + p.assists) / p.deaths).toFixed(2) : '∞';
    const displayName = p.riotName || p.summonerName;

    return (
        <div
            key={`${p.teamId}-${displayName}-${p.champion}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 100px 120px',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
        >
          {/* 英雄/名字/技能/出装 */}
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <Avatar
                size={40}
                src={getImageUrl(p.championPicture) || `https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/${p.champion}.png`}
                onError={(e) => { if (e && e.target) e.target.src = 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/0.png'; }}
            />
            <div style={{ marginLeft: 10, minWidth: 0, flex: 1 }}>
              {/* 名称 + 复制 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '20px',
                    minWidth: 0,
                    color: '#e8eaed'
                  }}
                  title={displayName}
              >
                {displayName}
              </span>
                <Tooltip title="复制">
                  <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(displayName)}
                  />
                </Tooltip>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 6, flexWrap: 'wrap' }}>
                {/* 技能（优先使用后端图片） */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.spells?.map((sp, i) => (
                      <Avatar
                          key={i}
                          size={18}
                          src={sp.picture ? getImageUrl(sp.picture) : `/spells/${sp.id}.png`}
                          onError={(e) => { if (e && e.target) e.target.src = `/spells/${sp.id}.png`; }}
                          style={{ background: '#fff' }}
                      />
                  ))}
                </div>
                {/* 出装（优先用后端返回的图片；缺失时回退到本地静态图） */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {p.itemPictures?.length
                      ? p.itemPictures.map((pic, i) => (
                          <Avatar key={i} size={18} src={getImageUrl(pic)} style={{ background: '#fff' }} />
                      ))
                      : p.items?.map((it, i) => <Avatar key={i} size={18} src={`/items/${it}.png`} />)}
                </div>
              </div>
            </div>
          </div>

          {/* KDA */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{kda}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>KDA {kdar}</div>
          </div>

          {/* 金钱 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{formatGold(p.goldEarned)}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>金钱</div>
          </div>

          {/* 英雄伤害 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{formatK(p.totalDamageDealt)}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>英雄伤害</div>
          </div>
        </div>
    );
  };

  /** 队伍卡片（模拟你截图的败方/胜方样式） */
  const renderTeamCard = (teamPlayers, color) => {
    const kills = teamPlayers.reduce((s, p) => s + (p.kills || 0), 0);
    const deaths = teamPlayers.reduce((s, p) => s + (p.deaths || 0), 0);
    const assists = teamPlayers.reduce((s, p) => s + (p.assists || 0), 0);
    const totalGold = teamPlayers.reduce((s, p) => s + (p.goldEarned || 0), 0);
    const isWin = teamPlayers.some((p) => p.isWin === true);

    const headerBg = isWin
        ? 'linear-gradient(90deg, rgba(24,144,255,0.18), rgba(24,144,255,0.02))'
        : 'linear-gradient(90deg, rgba(255,77,79,0.20), rgba(255,77,79,0.03))';
    const sideBar = isWin ? '#1890ff' : '#ff4d4f';

    return (
        <Card
            size="small"
            style={{
              marginBottom: 16,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
            title={
              <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderLeft: `4px solid ${sideBar}`,
                    background: headerBg,
                    borderRadius: 6,
                  }}
              >
                <div style={{ fontWeight: 700, color: isWin ? '#1e6fff' : '#cf1322' }}>
                  {isWin ? '胜方' : '败方'}　{kills} / {deaths} / {assists}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>团队金钱：{formatGold(totalGold)}</div>
              </div>
            }
            headStyle={{ borderBottom: 'none', padding: 0 }}
            bodyStyle={{ padding: 0 }}
        >
          {/* 表头 */}
          <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 100px 120px',
                padding: '6px 12px',
                fontSize: 12,
                opacity: 0.75,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
          >
            <div>玩家 / 技能 / 出装</div>
            <div style={{ textAlign: 'center' }}>KDA</div>
            <div style={{ textAlign: 'center' }}>金钱</div>
            <div style={{ textAlign: 'center' }}>英雄伤害</div>
          </div>
          {/* 玩家行 */}
          <div>{teamPlayers.map((p) => renderPlayerRow(p))}</div>
        </Card>
    );
  };

  /** 右侧详情区 */
  const renderMatchDetail = () => {
    if (detailLoading) {
      return (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>正在加载对局详情...</p>
          </div>
      );
    }
    if (!matchDetail) {
      return (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <TrophyOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <p>选择一场对局查看详情</p>
          </div>
      );
    }

    const players = matchDetail.players || [];
    const teamIds = Array.from(new Set(players.map((p) => p.teamId)));
    const is5v5 = teamIds.length === 2 && teamIds.includes(100) && teamIds.includes(200);

    if (is5v5) {
      const blue = players.filter((p) => p.teamId === 100);
      const red = players.filter((p) => p.teamId === 200);
      const blueWin = blue.some((p) => p.isWin);
      const first = blueWin ? red : blue;   // 先失败队
      const second = blueWin ? blue : red;  // 后胜利队
      return (
          <div style={{ paddingBottom: 8 }}>
            {renderTeamCard(first, blueWin ? '#ff4d4f' : '#1890ff')}
            {renderTeamCard(second, blueWin ? '#1890ff' : '#ff4d4f')}
          </div>
      );
    }

    // 其他模式：分组展示
    return (
        <div style={{ paddingBottom: 8 }}>
          {teamIds.sort((a, b) => a - b).map((id) => renderTeamCard(players.filter((p) => p.teamId === id), '#d9d9d9'))}
        </div>
    );
  };

  return (
      <div
          style={{
            padding: 16,
            height: '100vh',                 // 用满视口
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            background: '#0b0f15',          // 深色背景
          }}
      >
        <Row
            gutter={[16, 16]}
            style={{ flex: 1, minHeight: 0 }} // 关键：让子元素可滚动
        >
          {/* 左侧：最近战绩列表 —— 更窄 + 响应式 */}
          <Col
              xs={24}
              sm={10}
              md={8}
              lg={7}
              xl={6}
              xxl={5}                         // 大屏更窄（≈ 20%）
              style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div><UserOutlined style={{ marginRight: 8 }} />最近战绩</div>
                    <div><Button size="small" onClick={fetchMatchHistory}>刷新</Button></div>
                  </div>
                }
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                bodyStyle={{ padding: 10, flex: 1, overflow: 'auto' }}   // 关键：列表可滚动
            >
              {alertMessage && (
                  <Alert
                      message={alertMessage}
                      type={alertType}
                      showIcon
                      closable
                      onClose={() => setAlertMessage(null)}
                      style={{ marginBottom: 12 }}
                  />
              )}

              {loading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                    <p style={{ marginTop: 12 }}>正在加载数据...</p>
                  </div>
              ) : (
                  <div>
                    {/* 头部玩家信息（从第一局推断） */}
                    {matchHistory.length > 0 && (
                        <Card size="small" style={{ marginBottom: 12 }}>
                          <Row gutter={[8, 8]} align="middle">
                            <Col span={6}>
                              <Avatar
                                  size={44}
                                  src={`https://ddragon.leagueoflegends.com/cdn/15.19.1/img/profileicon/${matchHistory[0].profileIcon}.png`}
                                  onError={(e) => { if (e && e.target) e.target.src = 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/profileicon/0.png'; }}
                              />
                            </Col>
                            <Col span={18}>
                              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>
                                {matchHistory[0].summonerName}
                                {matchHistory[0].tagLine && <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>#{matchHistory[0].tagLine}</span>}
                              </div>
                            </Col>
                          </Row>
                        </Card>
                    )}

                    {/* 战绩列表 */}
                    {matchHistory.length > 0 ? (
                        <div>
                          {matchHistory.map((m) => (
                              <div
                                  key={m.gameId}
                                  onClick={() => handleMatchSelect(m)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px 10px',
                                    marginBottom: 8,
                                    borderRadius: 8,
                                    background: m.win ? 'rgba(82,196,26,0.12)' : 'rgba(255,77,79,0.12)',
                                    border: `1px solid ${m.win ? 'rgba(82,196,26,0.35)' : 'rgba(255,77,79,0.35)'}`,
                                    cursor: 'pointer',
                                  }}
                              >
                                <Avatar
                                    size={44}
                                    src={getImageUrl(m.championPicture) || `https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/${m.champion}.png`}
                                    onError={(e) => { if (e && e.target) e.target.src = 'https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/0.png'; }}
                                    style={{ marginRight: 10 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ddd', marginBottom: 2 }}>{m.gameType}</div>
                                  <div style={{ fontSize: 12, color: '#9aa4af' }}>
                                    {new Date(m.gameTime).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                  </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: m.win ? '#52c41a' : '#ff4d4f' }}>
                                  {m.win ? '胜利' : '失败'}
                                </div>
                              </div>
                          ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                          <TrophyOutlined style={{ fontSize: 46, marginBottom: 12 }} />
                          <p>暂无战绩记录</p>
                        </div>
                    )}
                  </div>
              )}
            </Card>
          </Col>

          {/* 右侧：对局详情 —— 永远可滚动显示完全 */}
          <Col
              xs={24}
              sm={14}
              md={16}
              lg={17}
              xl={18}
              xxl={19}
              style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <Card
                title={<div style={{ display: 'flex', alignItems: 'center' }}><TrophyOutlined style={{ marginRight: 8 }} />对局详情</div>}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}  // 关键
                bodyStyle={{ padding: 12, flex: 1, overflow: 'auto', minHeight: 0 }}  // 关键：内容区滚动
            >
              {renderMatchDetail()}
            </Card>
          </Col>
        </Row>
      </div>
  );
};

export default PersonalInfo;
