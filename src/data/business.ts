import { Inquiry, Lead, Opportunity, Project, CommunicationDetail, Customer, CustomerCase, CustomerPersona, CustomerFeedback } from '../types';

export const initialCommunications: CommunicationDetail[] = [];

export const initialBusinessCustomers: Customer[] = [];

// Historical alias kept for pages still importing initialCustomers from ../data
export const initialCustomers: Customer[] = initialBusinessCustomers;

export const initialPersonas: CustomerPersona[] = [];

export const initialCustomerFeedbacks: CustomerFeedback[] = [];

export const initialInquiries: Inquiry[] = [];

export const initialLeads: Lead[] = [];

export const initialOpportunities: Opportunity[] = [];

export const initialCustomerCases: CustomerCase[] = [];

export const initialProjects: Project[] = [];
