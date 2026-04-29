import { Inquiry, Lead, Opportunity, Project, CommunicationDetail, Customer, CustomerCase, CustomerPersona, CustomerFeedback } from '../types';

export const mockCommunications: CommunicationDetail[] = [];

export const mockBusinessCustomers: Customer[] = [];

// Historical alias kept for pages still importing mockCustomers from ../data
export const mockCustomers: Customer[] = mockBusinessCustomers;

export const mockPersonas: CustomerPersona[] = [];

export const mockCustomerFeedbacks: CustomerFeedback[] = [];

export const mockInquiries: Inquiry[] = [];

export const mockLeads: Lead[] = [];

export const mockOpportunities: Opportunity[] = [];

export const mockCustomerCases: CustomerCase[] = [];

export const mockProjects: Project[] = [];
