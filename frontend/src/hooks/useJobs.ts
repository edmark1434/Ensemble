import { useState, useCallback } from 'react';
import api from '../lib/axios';
import { uploadFileWithIntent } from '../lib/uploadFile';

export const useJobs = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = useCallback(async (filters?: any) => {
        setLoading(true);
        try {
            const res = await api.get('/api/jobs', { params: filters });
            return res.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch jobs');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createJob = async (jobData: any) => {
        setLoading(true);
        try {
            const res = await api.post('/api/jobs', jobData);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create job');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateJob = async (jobId: string, jobData: any) => {
        setLoading(true);
        try {
            const res = await api.put(`/api/jobs/${jobId}`, jobData);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update job');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteJob = async (jobId: string) => {
        setLoading(true);
        try {
            const res = await api.delete(`/api/jobs/${jobId}`);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete job');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Proposals
    const createProposal = async (jobId: string, proposalData: any) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/jobs/${jobId}/proposals`, proposalData);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit proposal');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const fetchSentProposals = async (scope: 'personal' | 'teams' | 'all' = 'personal') => {
        setLoading(true);
        try {
            const res = await api.get('/api/jobs/proposals/sent', { params: { scope } });
            return res.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch sent proposals');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const fetchProposalsByJob = async (jobId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/jobs/${jobId}/proposals`);
            return res.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch proposals');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const fetchProposalById = async (proposalId: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/api/jobs/proposals/${proposalId}`);
            return res.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch proposal details');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateProposalStatus = async (proposalId: string, statusData: any) => {
        setLoading(true);
        try {
            const res = await api.put(`/api/jobs/proposals/${proposalId}/status`, statusData);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update status');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const withdrawProposal = async (proposalId: string) => {
        setLoading(true);
        try {
            const res = await api.delete(`/api/jobs/proposals/${proposalId}`);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to withdraw proposal');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getTermsOfService = async (type: string = 'jobs') => {
        setLoading(true);
        try {
            const res = await api.get(`/api/jobs/tos?type=${type}`);
            return res.data.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch TOS');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const uploadAttachment = async (file: File, folder: string = 'jobs') => {
        setLoading(true);
        try {
            const uploaded = await uploadFileWithIntent(file, folder);
            return uploaded.fileId;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to upload attachment');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const toggleJobSave = async (jobId: string) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/jobs/${jobId}/save`);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to toggle save');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Contracts (Job Offers)
    const sendJobOffer = async (proposalId: string, rateCredits: number, startsAt?: string) => {
        setLoading(true);
        try {
            const res = await api.post('/api/contracts/job-offer', { proposalId, rateCredits, startsAt });
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send job offer');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const acceptJobOffer = async (contractId: string) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/contracts/${contractId}/accept`);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to accept job offer');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const rejectContract = async (contractId: string, reason: string) => {
        setLoading(true);
        try {
            const res = await api.post(`/api/contracts/${contractId}/reject`, { reason });
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reject job offer');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        fetchJobs,
        createJob,
        updateJob,
        deleteJob,
        createProposal,
        fetchSentProposals,
        fetchProposalsByJob,
        fetchProposalById,
        updateProposalStatus,
        withdrawProposal,
        getTermsOfService,
        uploadAttachment,
        toggleJobSave,
        sendJobOffer,
        acceptJobOffer,
        rejectContract
    };
};
