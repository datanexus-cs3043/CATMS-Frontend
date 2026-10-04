import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  invoiceService, insuranceService, patientService, apiErrorMessage,
  Invoice, InvoiceItem, InsuranceClaim, InsurancePolicy, Payment,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { localDate } from '../services/mockData';
import { invoiceStatusBadge } from './Invoices';

const money = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString()}`;
const th: React.CSSProperties = { padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' };

export default function InvoiceDetails() { 
    

}