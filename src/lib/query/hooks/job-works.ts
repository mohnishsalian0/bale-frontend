"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getJobWorks,
  getJobWorkByNumber,
  getJobWorkById,
  createJobWork,
  cancelJobWork,
  completeJobWork,
  updateJobWork,
  updateJobWorkWithItems,
  deleteJobWork,
  type JobWorkFilters,
  type CreateJobWorkData,
  type CreateJobWorkLineItem,
  type UpdateJobWorkData,
  type CancelJobWorkData,
  type CompleteJobWorkData,
} from "@/lib/queries/job-works";
import { JobWorkUpdate } from "@/types/job-works.types";

/**
 * Fetch job works with optional filters
 *
 * Examples:
 * - All job works: useJobWorks({ })
 * - Pending job works: useJobWorks({ filters: { status: 'approval_pending' } })
 * - Active job works: useJobWorks({ filters: { status: ['approval_pending', 'in_progress'] } })
 * - Paginated: useJobWorks({ filters, page, pageSize })
 */
export function useJobWorks({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: JobWorkFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.jobWorks.all(filters, page),
    queryFn: () => getJobWorks(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.JOB_WORKS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch job works with infinite scroll
 *
 * Used in link-to steps where we need to display a scrollable list of job works
 */
export function useInfiniteJobWorks(
  filters?: JobWorkFilters,
  pageSize: number = 30,
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.jobWorks.all(filters, 1), "infinite"],
    queryFn: ({ pageParam = 1 }) => getJobWorks(filters, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    ...getQueryOptions(STALE_TIME.JOB_WORKS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch single job work by sequence number
 */
export function useJobWorkByNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.jobWorks.detail(sequenceNumber || ""),
    queryFn: () => getJobWorkByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.JOB_WORKS, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch single job work by ID (UUID)
 */
export function useJobWorkById(orderId: string | null) {
  return useQuery({
    queryKey: queryKeys.jobWorks.detail(orderId || ""),
    queryFn: () => getJobWorkById(orderId!),
    ...getQueryOptions(STALE_TIME.JOB_WORKS, GC_TIME.TRANSACTIONAL),
    enabled: !!orderId,
  });
}

/**
 * Job work mutations (create, update, delete)
 */
export function useJobWorkMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({
      orderData,
      lineItems,
    }: {
      orderData: CreateJobWorkData;
      lineItems: CreateJobWorkLineItem[];
    }) => createJobWork(orderData, lineItems),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({
      orderId,
      cancelData,
    }: {
      orderId: string;
      cancelData: CancelJobWorkData;
    }) => cancelJobWork(orderId, cancelData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  const complete = useMutation({
    mutationFn: ({
      orderId,
      completeData,
    }: {
      orderId: string;
      completeData: CompleteJobWorkData;
    }) => completeJobWork(orderId, completeData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: Partial<JobWorkUpdate>;
    }) => updateJobWork(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  const updateWithItems = useMutation({
    mutationFn: ({
      orderId,
      orderData,
      lineItems,
    }: {
      orderId: string;
      orderData: UpdateJobWorkData;
      lineItems: CreateJobWorkLineItem[];
    }) => updateJobWorkWithItems(orderId, orderData, lineItems),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  const delete_ = useMutation({
    mutationFn: (orderId: string) => deleteJobWork(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["job-works"],
      });
    },
  });

  return {
    create,
    cancel,
    complete,
    update,
    updateWithItems,
    delete: delete_,
  };
}
