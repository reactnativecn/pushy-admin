import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { JSONEditor, type Content, type OnChange } from 'vanilla-jsoneditor';
import { adminApi } from '@/services/admin-api';

const { Title } = Typography;

// JSON Editor wrapper component for quota editing
const JsonEditorWrapper = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const handleChange: OnChange = (
        content: Content,
        _previousContent: Content,
        { contentErrors },
      ) => {
        if (!contentErrors) {
          if ('json' in content && content.json !== undefined) {
            onChange(JSON.stringify(content.json, null, 2));
          } else if ('text' in content) {
            onChange(content.text);
          }
        }
      };

      editorRef.current = new JSONEditor({
        target: containerRef.current,
        props: {
          content: { text: value },
          onChange: handleChange,
          mode: 'text',
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.update({ text: value });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height: 200 }} />;
};

export const Component = () => {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();
  const [quotaValue, setQuotaValue] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminUsers', debouncedSearch],
    queryFn: () => adminApi.searchUsers(debouncedSearch || undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminUser> }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      message.success('用户信息已更新');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const handleEdit = (record: AdminUser) => {
    setEditingUser(record);
    form.setFieldsValue({
      tier: record.tier,
      status: record.status,
      tierExpiresAt: record.tierExpiresAt ? dayjs(record.tierExpiresAt) : null,
    });
    setQuotaValue(record.quota ? JSON.stringify(record.quota, null, 2) : '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!editingUser) return;

      const updateData: Partial<AdminUser> = {
        tier: values.tier,
        status: values.status,
        tierExpiresAt: values.tierExpiresAt
          ? values.tierExpiresAt.toISOString()
          : null,
      };

      // Parse quota if provided
      if (quotaValue.trim()) {
        try {
          updateData.quota = JSON.parse(quotaValue);
        } catch {
          message.error('Quota 格式无效，请输入有效的 JSON');
          return;
        }
      } else {
        updateData.quota = null;
      }

      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <span className={status === 'normal' ? 'text-green-600' : 'text-orange-500'}>
          {status === 'normal' ? '正常' : '未验证'}
        </span>
      ),
    },
    {
      title: '套餐',
      dataIndex: 'tier',
      key: 'tier',
      width: 100,
    },
    {
      title: '套餐过期时间',
      dataIndex: 'tierExpiresAt',
      key: 'tierExpiresAt',
      width: 180,
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '自定义配额',
      dataIndex: 'quota',
      key: 'quota',
      width: 100,
      render: (quota: Quota | null) => (quota ? '有' : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AdminUser) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <Title level={4} className="m-0!">
            用户管理
          </Title>
          <Input
            placeholder="搜索用户名或邮箱"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            className="w-full md:w-72"
          />
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>

      <Modal
        title={`编辑用户: ${editingUser?.email}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            保存
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item name="tier" label="套餐" className="mb-0!">
              <Select
                options={[
                  { value: 'free', label: '免费版' },
                  { value: 'standard', label: '标准版' },
                  { value: 'premium', label: '高级版' },
                  { value: 'pro', label: '专业版' },
                  { value: 'custom', label: '定制版' },
                ]}
              />
            </Form.Item>
            <Form.Item name="status" label="状态" className="mb-0!">
              <Select
                options={[
                  { value: 'normal', label: '正常' },
                  { value: 'unverified', label: '未验证' },
                ]}
              />
            </Form.Item>
            <Form.Item name="tierExpiresAt" label="套餐过期时间" className="mb-0!">
              <DatePicker showTime className="w-full" />
            </Form.Item>
            <Form.Item label="自定义配额 (JSON，留空则使用默认配额)" className="mb-0!">
              <JsonEditorWrapper value={quotaValue} onChange={setQuotaValue} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
