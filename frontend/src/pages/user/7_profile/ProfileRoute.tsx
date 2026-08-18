import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/lib/axios";
import NotFound from "@/pages/user/0_misc/NotFound.tsx";
import Profile from "./Profile.tsx";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined): value is string =>
  Boolean(value && UUID_PATTERN.test(value));

type ValidationState = "checking" | "found" | "not-found" | "error";

const pendingValidationRequests = new Map<string, Promise<"found" | "not-found">>();

function validateProfile(id: string) {
  const pendingRequest = pendingValidationRequests.get(id);
  if (pendingRequest) return pendingRequest;

  const request = api
    .get(`/api/accounts/check-user/${id}`)
    .then((response) => (response.data?.isUser === true ? "found" : "not-found") as const)
    .catch((error) => {
      const status = error.response?.status;
      if (status === 400 || status === 404) return "not-found" as const;
      throw error;
    })
    .finally(() => {
      pendingValidationRequests.delete(id);
    });

  pendingValidationRequests.set(id, request);
  return request;
}

function ProfileRouteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base p-4 md:p-8">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-16 rounded-2xl bg-gray-200 dark:bg-dark-elevated" />
        <div className="h-64 rounded-2xl bg-gray-200 dark:bg-dark-elevated" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
          <div className="h-72 rounded-2xl bg-gray-200 dark:bg-dark-elevated" />
          <div className="h-72 rounded-2xl bg-gray-200 dark:bg-dark-elevated" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileRoute() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<ValidationState>(() =>
    isUuid(id) ? "checking" : "not-found"
  );

  useEffect(() => {
    if (!isUuid(id)) {
      setState("not-found");
      return;
    }

    let isCurrent = true;
    setState("checking");

    void validateProfile(id)
      .then((nextState) => {
        if (!isCurrent) return;
        setState(nextState);
      })
      .catch(() => {
        if (!isCurrent) return;
        setState("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (state === "not-found") return <NotFound />;
  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-base px-4 text-center text-sm text-zinc-400">
        Unable to load this profile. Please try again.
      </div>
    );
  }
  if (state === "checking" || !id) return <ProfileRouteSkeleton />;

  return <Profile validatedProfileId={id} />;
}
