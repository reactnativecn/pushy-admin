import { CopyOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminApi,
  type CustomOrder,
  type CustomOrderStatus,
} from '@/services/admin-api';
import { adminKeys } from '@/utils/query-keys';
import { useModalWidth } from '@/utils/responsive';

const { Title, Paragraph, Text } = Typography;

const STATUS_COLORS: Record<CustomOrderStatus, string> = {
  pending: 'orange',
  done: 'green',
  cancelled: 'default',
};

type CreateForm = {
  amount: number;
  subject: string;
  note?: string;
};

export const Component = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const modalWidth = useModalWidth(560);
  const [form] = Form.useForm<CreateForm>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [created, setCreated] = useState<CustomOrder | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: adminKeys.customOrders(page, pageSize),
    queryFn: () =>
      adminApi.listCustomOrders({
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateForm) =>
      adminApi.createCustomOrder({
        // 金额以两位小数字符串提交，避免浮点误差
        amount: values.amount.toFixed(2),
        subject: values.subject.trim(),
        note: values.note?.trim() || undefined,
      }),
    onSuccess: (order) => {
      setIsCreateOpen(false);
      form.resetFields();
      setCreated(order);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: adminKeys.customOrders() });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNo: string) => adminApi.cancelCustomOrder(orderNo),
    onSuccess: () => {
      message.success(t('admin_custom_orders.voided'));
      queryClient.invalidateQueries({ queryKey: adminKeys.customOrders() });
    },
  });

  const copyLink = async (link: string) => {
    // 非安全上下文没有 clipboard,写入也可能被权限拒绝,失败要告诉用户
    try {
      await navigator.clipboard.writeText(link);
      message.success(t('admin_custom_orders.copied'));
    } catch {
      message.error(t('admin_custom_orders.copy_failed'));
    }
  };

  const columns: ColumnsType<CustomOrder> = [
    {
      title: t('admin_custom_orders.col_order_no'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      responsive: ['lg'],
      render: (orderNo: string) => (
        <Text className="font-mono text-xs" copyable>
          {orderNo}
        </Text>
      ),
    },
    {
      title: t('admin_custom_orders.col_subject'),
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: t('admin_custom_orders.col_amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount: string) => `¥${amount}`,
    },
    {
      title: t('admin_custom_orders.col_status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: CustomOrderStatus) => (
        <Tag color={STATUS_COLORS[status]}>
          {t(`admin_custom_orders.status_${status}`)}
        </Tag>
      ),
    },
    {
      title: t('admin_custom_orders.col_note'),
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      responsive: ['md'],
    },
    {
      title: t('admin_custom_orders.col_created_at'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['md'],
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin_custom_orders.col_pay_time'),
      dataIndex: 'payTime',
      key: 'payTime',
      responsive: ['lg'],
      render: (value: string) => value || '-',
    },
    {
      title: t('admin_custom_orders.col_action'),
      key: 'action',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            type="link"
            icon={<CopyOutlined />}
            onClick={() => copyLink(record.payUrl)}
          >
            {t('admin_custom_orders.copy_link')}
          </Button>
          <Button
            size="small"
            type="link"
            icon={<LinkOutlined />}
            href={record.payUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('admin_custom_orders.open_link')}
          </Button>
          {record.status === 'pending' && (
            <Popconfirm
              title={t('admin_custom_orders.void_confirm')}
              onConfirm={() => cancelMutation.mutate(record.orderNo)}
            >
              <Button size="small" type="link" danger>
                {t('admin_custom_orders.void')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <Title level={4} className="m-0!">
            {t('admin_custom_orders.title')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateOpen(true)}
          >
            {t('admin_custom_orders.create')}
          </Button>
        </div>
        <Paragraph type="secondary">
          {t('admin_custom_orders.description')}
        </Paragraph>
        <Table
          rowKey="orderNo"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading || isFetching}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page,
            pageSize,
            total: data?.count ?? 0,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <Modal
        title={t('admin_custom_orders.create_title')}
        open={isCreateOpen}
        width={modalWidth}
        okText={t('admin_custom_orders.submit')}
        cancelText={t('admin_custom_orders.cancel')}
        confirmLoading={createMutation.isPending}
        onOk={() => form.submit()}
        onCancel={() => setIsCreateOpen(false)}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="amount"
            label={t('admin_custom_orders.amount')}
            rules={[
              {
                required: true,
                message: t('admin_custom_orders.amount_required'),
              },
            ]}
          >
            <InputNumber
              className="w-full"
              min={0.01}
              max={1000000}
              precision={2}
              step={1}
              prefix="¥"
            />
          </Form.Item>
          <Form.Item
            name="subject"
            label={t('admin_custom_orders.subject')}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t('admin_custom_orders.subject_required'),
              },
              {
                pattern: /^[^/=&]*$/,
                message: t('admin_custom_orders.subject_invalid'),
              },
            ]}
          >
            <Input
              maxLength={128}
              showCount
              placeholder={t('admin_custom_orders.subject_placeholder')}
            />
          </Form.Item>
          <Form.Item name="note" label={t('admin_custom_orders.note')}>
            <Input.TextArea
              maxLength={255}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder={t('admin_custom_orders.note_placeholder')}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('admin_custom_orders.created_title')}
        open={created !== null}
        width={modalWidth}
        onCancel={() => setCreated(null)}
        footer={[
          <Button key="close" onClick={() => setCreated(null)}>
            {t('admin_custom_orders.close')}
          </Button>,
          <Button
            key="copy"
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => created && copyLink(created.payUrl)}
          >
            {t('admin_custom_orders.copy_link')}
          </Button>,
        ]}
      >
        {created && (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">
              {t('admin_custom_orders.created_hint')}
            </Text>
            <Text strong>
              {created.subject} · ¥{created.amount}
            </Text>
            <Input.TextArea
              readOnly
              value={created.payUrl}
              autoSize
              className="font-mono"
              onFocus={(event) => event.target.select()}
            />
          </Space>
        )}
      </Modal>
    </div>
  );
};
