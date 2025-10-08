import React, { useState, useMemo } from 'react';
import {
  Card, Form, Input, Button, Row, Col, Space, Typography, message,
  Spin, Alert, List, Tag, Divider, Tooltip, Statistic, Empty
} from 'antd';
import { SearchOutlined, UserOutlined, TrophyOutlined, ClockCircleOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

// ======= 可按需修改 =======
const API_BASE = '/api'; // 例如 Nginx 代理到后端时使用的前缀
const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

/** 工具：格式化时长（秒 -> mm:ss） */
function formatDuration(sec) {
  if (sec == null || isNaN(sec)) return '-';
  const s = Math.max(0, Math.round(sec));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/** 工具：时间戳友好展示（毫秒/秒 兼容） */
function formatTime(ts) {
  if (!ts) return '-';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${DD} ${hh}:${mm}`;
}

/** 工具：KDA 文案 */
function kdaText(kills, deaths, assists) {
  const k = Number(kills || 0), d = Number(deaths || 0), a = Number(assists || 0);
  const ratio = d === 0 ? (k + a) : (k + a) / d;
  return `${k}/${d}/${a}  (${ratio.toFixed(2)} KDA)`;
}

/** 工具：拷贝 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard?.writeText(text);
    message.success('已复制');
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      message.success('已复制');
      document.body.removeChild(ta);
    } catch {
      message.error('复制失败');
    }
  }
}

/** 统一解析后端包装：兼容 {code,data,msg} / {success,data,message} 等 */
function unwrap(res) {
  // axios 返回：res.data 是后端 Result
  const payload = res?.data;
  if (!payload) return { ok: false, data: null, msg: '无响应体' };

  // 常见规范兜底：code===200 或 success===true
  const code = payload.code ?? payload.status ?? null;
  const ok = payload.success === true || code === 200 || code === 0;
  const msg = payload.message || payload.msg || payload.error || '';
  return { ok, data: payload.data ?? payload.result ?? null, msg };
}

/**
 * 假定 MatchHistoryVO 结构（根据你之前的页面推断）：
 * {
 *   playerInfo: { gameName, tagLine, summonerLevel, profileIconId, puuid, ... },
 *   matches: [
 *     {
 *       matchId, queueType, gameStartTimestamp, gameDuration,
 *       win, championName, kills, deaths, assists, cs, gold, damage, position, ...
 *     }, ...
 *   ],
 *   summary: { total, wins, losses, winRate, mvpCount, ... } // 可选
 * }
 * 下面渲染时都做了健壮性判断；字段缺失也能正常显示基础信息。
 */

const PlayerHeader = ({ info, summary }) => {
  const nameText = info ? `${info.gameName || '-'}#${info.tagLine || '-'}` : '-';
  const level = info?.summonerLevel ?? '-';

  return (
      <Card bordered style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="none">
            <UserOutlined style={{ fontSize: 40 }} />
          </Col>
          <Col flex="auto">
            <Space direction="vertical" size={4}>
              <Space align="center">
                <Title level={4} style={{ margin: 0 }}>{nameText}</Title>
                <Tooltip title="复制召唤师名#tag">
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(nameText)} />
                </Tooltip>
              </Space>
              <Text type="secondary">等级：{level}</Text>
            </Space>
          </Col>
          <Col flex="none">
            <Space size="large" wrap>
              <Statistic title="对局数" value={summary?.total ?? '-'} />
              <Statistic title="胜场" value={summary?.wins ?? '-'} />
              <Statistic title="败场" value={summary?.losses ?? '-'} />
              <Statistic title="胜率" value={summary?.winRate != null ? `${summary.winRate}%` : '-'} />
            </Space>
          </Col>
        </Row>
      </Card>
  );
};

const MatchItem = ({ m }) => {
  const win = !!m?.win;
  const resultTag = win ? <Tag color="green">胜利</Tag> : <Tag color="red">失败</Tag>;
  const champ = m?.championName || '未知英雄';
  const queue = m?.queueType || '未知模式';
  const start = formatTime(m?.gameStartTimestamp);
  const dur = formatDuration(m?.gameDuration);
  const pos = m?.position || m?.lane || '';
  const kda = kdaText(m?.kills, m?.deaths, m?.assists);

  return (
      <Card size="small">
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} md={6}>
            <Space wrap>
              <Tag icon={<TrophyOutlined />} color="blue">{queue}</Tag>
              {resultTag}
              {pos ? <Tag>{pos}</Tag> : null}
            </Space>
            <div style={{ marginTop: 6 }}>
              <Text type="secondary"><ClockCircleOutlined /> {start} · {dur}</Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Text strong>{champ}</Text>
              <Text>{kda}</Text>
            </Space>
          </Col>
          <Col xs={24} md={10}>
            <Space size="large" wrap>
              {'cs' in m ? <Text>补刀：{m.cs}</Text> : null}
              {'gold' in m ? <Text>金币：{m.gold}</Text> : null}
              {'damage' in m ? <Text>伤害：{m.damage}</Text> : null}
              {'visionScore' in m ? <Text>视野：{m.visionScore}</Text> : null}
            </Space>
          </Col>
        </Row>
      </Card>
  );
};

const MatchList = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return <Empty description="暂无对局" style={{ marginTop: 24 }} />;
  }
  return (
      <List
          style={{ marginTop: 16 }}
          grid={{ gutter: 12, column: 1 }}
          dataSource={matches}
          renderItem={(m) => (
              <List.Item key={m?.matchId || Math.random()}>
                <MatchItem m={m} />
              </List.Item>
          )}
      />
  );
};

const PlayerRecordSearch = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState(null); // MatchHistoryVO

  const summary = useMemo(() => {
    const matches = data?.matches || [];
    if (!matches.length) return { total: 0, wins: 0, losses: 0, winRate: 0 };
    const wins = matches.filter(m => !!m?.win).length;
    const losses = matches.length - wins;
    const winRate = Math.round((wins / matches.length) * 100);
    return { total: matches.length, wins, losses, winRate };
  }, [data]);

  const handleSearch = async (values) => {
    const { gameName, tagLine } = values || {};
    if (!gameName || !tagLine) {
      message.warning('请填写召唤师名字与 tagLine');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    setData(null);
    try {
      // 用 x-www-form-urlencoded 传参，符合 @RequestParam 的绑定
      const body = new URLSearchParams({ gameName, tagLine });
      const res = await api.post('/history/player/match', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const { ok, data, msg } = unwrap(res);
      if (!ok) {
        setErrorMsg(msg || '查询失败');
        return;
      }
      if (!data) {
        setErrorMsg('未查询到数据');
        return;
      }
      setData(data);
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{ padding: 16 }}>
        <Card>
          <Form
              form={form}
              layout="inline"
              onFinish={handleSearch}
              initialValues={{ gameName: '', tagLine: '' }}
          >
            <Form.Item
                name="gameName"
                label="召唤师名字"
                rules={[{ required: true, message: '请输入召唤师名字（gameName）' }]}
            >
              <Input
                  allowClear
                  placeholder="如：Faker"
                  style={{ width: 240 }}
              />
            </Form.Item>
            <Form.Item
                name="tagLine"
                label="tagLine"
                rules={[{ required: true, message: '请输入 tagLine（#后面的数字/字母）' }]}
            >
              <Input
                  allowClear
                  placeholder="如：KR1"
                  style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  查询
                </Button>
                <Button onClick={() => { form.resetFields(); setData(null); setErrorMsg(''); }}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>

          {loading && (
              <div style={{ marginTop: 16 }}>
                <Spin tip="查询中..." />
              </div>
          )}

          {!!errorMsg && !loading && (
              <div style={{ marginTop: 16 }}>
                <Alert type="error" message={errorMsg} showIcon />
              </div>
          )}
        </Card>

        {/* 查询结果 */}
        {data && !loading && (
            <>
              <PlayerHeader info={data.playerInfo} summary={data.summary ?? summary} />
              <Divider />
              <MatchList matches={data.matches} />
            </>
        )}
      </div>
  );
};

export default PlayerRecordSearch;
