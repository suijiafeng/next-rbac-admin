'use client';

import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import type { UserItem } from '@/types/user';

export interface UserFormValues {
    username: string;
    nickname: string;
    email?: string;
    status: number;
}

interface UserModalProps {
    open: boolean;
    title: string;
    loading: boolean;
    initialValues?: Partial<UserItem>;
    onCancel: () => void;
    onOk: (values: UserFormValues) => void;
}

export default function UserModal(props: UserModalProps) {
    const { open, title, loading, initialValues, onCancel, onOk } = props;

    const [form] = Form.useForm<UserFormValues>();
    const { Item } = Form;

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setFieldsValue({
            username: initialValues?.username || '',
            nickname: initialValues?.nickname || '',
            email: initialValues?.email || '',
            status: initialValues?.status ?? 1,
        });
    }, [form, initialValues, open]);

    const handleSubmit = async () => {
        const values = await form.validateFields();
        onOk(values);
    };

    return (
        <Modal
            open={open}
            title={title}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            destroyOnHidden
        >
            <Form form={form} layout="vertical" autoComplete="off">
                <Item
                    label="用户名"
                    name="username"
                    rules={[
                        {
                            required: true,
                            message: '请输入用户名',
                        },
                    ]}
                >
                    <Input placeholder="请输入用户名" autoComplete="off" />
                </Item>

                <Item
                    label="昵称"
                    name="nickname"
                    rules={[
                        {
                            required: true,
                            message: '请输入昵称',
                        },
                    ]}
                >
                    <Input placeholder="请输入昵称" autoComplete="off" />
                </Item>

                <Item label="邮箱" name="email">
                    <Input placeholder="请输入邮箱" autoComplete="off" />
                </Item>

                <Item label="状态" name="status">
                    <Select
                        options={[
                            { label: '启用', value: 1 },
                            { label: '禁用', value: 0 },
                        ]}
                    />
                </Item>
            </Form>
        </Modal>
    );
}
