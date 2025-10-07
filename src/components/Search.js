import React, { useState } from 'react';
import { Card, Input, Button, Row, Col, Statistic, Table, Alert, Avatar, Tag, Empty, Spin } from 'antd';
import { SearchOutlined, UserOutlined, TrophyOutlined, FireOutlined, StarOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Search } = Input;

const SearchPage = () => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [playerInfo, setPlayerInfo] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [searched, setSearched] = useState(false);

  // 搜索玩家信息
  const handleSearch = async (value) => {
    if (!value.trim()) {
      setAlertMessage('请输入玩家名称！');
      setAlertType('error');
      return;
    }

    setLoading(true);
    setAlertMessage(null);
    setSearched(true);
    
    try {
      // 搜索玩家基本信息
      const playerResponse = await axios.get(`http://localhost:8080/player/search?name=${encodeURIComponent(value)}`);
      
      if (playerResponse.data.code === 200) {
        const playerData = playerResponse.data.data;
        setPlayerInfo(playerData);
        setAlertMessage(`找到玩家：${playerData.summonerName}`);
        setAlertType('success');
        
        // 获取该玩家的对战历史
        try {
          const matchResponse = await axios.get(`http://localhost:8080/player/matches?summonerId=${playerData.summonerId}`);
          if (matchResponse.data.code === 200) {
            setMatchHistory(matchResponse.data.data || []);
          }
        } catch (matchError) {
          console.error('获取对战历史失败:', matchError);
          setMatchHistory([]);
        }
      } else {
        setAlertMessage('未找到该玩家，请检查玩家名称是否正确！');
        setAlertType('error');
        setPlayerInfo(null);
        setMatchHistory([]);
      }
    } catch (error) {
      console.error('搜索玩家失败:', error);
      setAlertMessage('搜索失败！请检查网络连接或玩家名称。');
      setAlertType('error');
      setPlayerInfo(null);
      setMatchHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // 对战历史表格列定义
  const matchColumns = [
    {
      title: '游戏模式',
      dataIndex: 'gameMode',
      key: 'gameMode',
      render: (mode) => <Tag color="blue">{mode}</Tag>
    },
    {
      title: '英雄',
      dataIndex: 'champion',
      key: 'champion',
      render: (champion) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar size="small" src={`/champions/${champion}.png`} />
          <span style={{ marginLeft: 8 }}>{champion}</span>
        </div>
      )
    },
    {
      title: '胜负',
      dataIndex: 'win',
      key: 'win',
      render: (win) => (
        <Tag color={win ? 'green' : 'red'}>
          {win ? '胜利' : '失败'}
        </Tag>
      )
    },
    {
      title: 'K/D/A',
      key: 'kda',
      render: (_, record) => `${record.kills}/${record.deaths}/${record.assists}`
    },
    {
      title: '游戏时长',
      dataIndex: 'gameDuration',
      key: 'gameDuration',
      render: (duration) => {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    },
    {
      title: '游戏时间',
      dataIndex: 'gameTime',
      key: 'gameTime',
      render: (time) => new Date(time).toLocaleString()
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        {/* 搜索区域 */}
        <Col span={24}>
          <Card title="搜索玩家">
            <Row gutter={[16, 16]} align="middle">
              <Col span={16}>
                <Search
                  placeholder="请输入玩家名称"
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={handleSearch}
                  loading={loading}
                  enterButton={
                    <Button type="primary" icon={<SearchOutlined />} loading={loading}>
                      搜索
                    </Button>
                  }
                />
              </Col>
              <Col span={8}>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  💡 支持搜索召唤师名称
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 提示信息 */}
        {alertMessage && (
          <Col span={24}>
            <Alert
              message={alertMessage}
              type={alertType}
              showIcon
              closable
              onClose={() => setAlertMessage(null)}
            />
          </Col>
        )}

        {/* 加载状态 */}
        {loading && (
          <Col span={24}>
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <p style={{ marginTop: '16px' }}>正在搜索玩家信息...</p>
              </div>
            </Card>
          </Col>
        )}

        {/* 玩家信息 */}
        {!loading && playerInfo && (
          <Col span={24}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <UserOutlined style={{ marginRight: 8 }} />
                  玩家信息
                </div>
              }
            >
              <Row gutter={[24, 24]}>
                {/* 基本信息 */}
                <Col span={24}>
                  <Card size="small" title="基本信息">
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <div style={{ textAlign: 'center' }}>
                          <Avatar size={80} src={playerInfo.profileIconUrl} />
                          <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                            {playerInfo.summonerName}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            {playerInfo.summonerLevel}级
                          </div>
                        </div>
                      </Col>
                      <Col span={18}>
                        <Row gutter={[16, 16]}>
                          <Col span={8}>
                            <Statistic
                              title="当前段位"
                              value={playerInfo.tier || '未定级'}
                              prefix={<TrophyOutlined />}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="胜点"
                              value={playerInfo.leaguePoints || 0}
                              suffix="LP"
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="排位胜率"
                              value={playerInfo.winRate || 0}
                              suffix="%"
                              precision={1}
                            />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                </Col>

                {/* 统计信息 */}
                <Col span={24}>
                  <Card size="small" title="排位统计">
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic
                          title="总场次"
                          value={playerInfo.totalGames || 0}
                          prefix={<FireOutlined />}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="胜场"
                          value={playerInfo.wins || 0}
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="负场"
                          value={playerInfo.losses || 0}
                          valueStyle={{ color: '#cf1322' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="胜率"
                          value={playerInfo.winRate || 0}
                          suffix="%"
                          precision={1}
                          prefix={<StarOutlined />}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        )}

        {/* 对战历史 */}
        {!loading && playerInfo && (
          <Col span={24}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TrophyOutlined style={{ marginRight: 8 }} />
                  最近对战记录
                </div>
              }
            >
              <Table
                columns={matchColumns}
                dataSource={matchHistory}
                rowKey="gameId"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条记录`
                }}
                locale={{
                  emptyText: '暂无对战记录'
                }}
              />
            </Card>
          </Col>
        )}

        {/* 空状态 */}
        {!loading && searched && !playerInfo && (
          <Col span={24}>
            <Card>
              <Empty
                image={<SearchOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
                description="未找到玩家信息"
              />
            </Card>
          </Col>
        )}

        {/* 初始状态 */}
        {!loading && !searched && (
          <Col span={24}>
            <Card>
              <Empty
                image={<SearchOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
                description="请输入玩家名称进行搜索"
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default SearchPage;