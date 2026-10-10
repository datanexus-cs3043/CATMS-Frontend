import React, { useState, useEffect, useMemo } from 'react';
import { branchService, Branch, staffService, Staff } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Branches() {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<Branch>>({
    branch_name: '',
    location: '',
    contact_details: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [b, s] = await Promise.all([
        branchService.getAll(),
        staffService.getAll(),
      ]);
      setBranches(b);
      setStaffList(s);
    } catch {
      /* noop */
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await branchService.create(form);
      setShowModal(false);
      setForm({ branch_name: '', location: '', contact_details: '' });
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const staffByBranch = useMemo(() => {
    const map = new Map<number, Staff[]>();
    staffList.forEach((s) => {
      const list = map.get(s.branch_id) ?? [];
      list.push(s);
      map.set(s.branch_id, list);
    });
    return map;
  }, [staffList]);

  


}  