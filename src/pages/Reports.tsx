import React, { useState, useEffect, useMemo } from 'react';
import {
  reportsService,
  BranchAppointmentSummary,
  DoctorRevenueReport,
  OutstandingPatient,
  TreatmentCountReport,
  InsuranceSummary,
} from '../services/api';
import { useAuth } from '../auth/AuthContext';
import {
  Download,
  RefreshCw,
  Calendar,
  FileText,
  CheckCircle2,
  DollarSign,
  Building2,
  Shield,
  Search,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Award,
} from 'lucide-react';

type ReportType = 'branch' | 'doctor_revenue' | 'outstanding' | 'treatment' | 'insurance';