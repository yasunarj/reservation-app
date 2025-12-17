"use client";

import { useState, useTransition, FormEvent } from "react";
import Link from "next/link";
import SearchForm from "./SearchForm";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type ReservationStatus = "pending" | "confirmed" | "cancelled";

type Reservation = {
  id: number;
  name: string;
  date: string;
  note: string | null;
  status: ReservationStatus;
};

type ReservationResponse = {
  items: Reservation[];
  totalCount: number;
  page: number;
  perPage: number;
  totalPages: number;
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "保留",
  confirmed: "確定",
  cancelled: "キャンセル",
};

const STATUS_CLASS: Record<ReservationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border border-green-200",
  cancelled: "bg-red-100 text-red-800 border border-red-200",
};

type Props = {
  initialData: ReservationResponse;
};

const ReservationsList = ({ initialData }: Props) => {
  const { handleApiError } = useApi();

  const [data, setData] = useState<ReservationResponse>(initialData);
  const reservations = data.items;
  const [isPending, startTransition] = useTransition();

  const [keyword, setKeyword] = useState<string>("");
  const [sort, setSort] = useState<"date_asc" | "date_desc">("date_asc");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleDelete = async (id: number) => {
    const ok = confirm("この予約を削除してもよろしいですか？");
    if (!ok) return;

    try {
      await apiFetch(`/reservations/${id}`, { method: "DELETE" });

      startTransition(() => {
        setData((prev) => ({
          ...prev,
          totalCount: prev.totalCount - 1,
          items: prev.items.filter((r) => r.id !== id),
        }));
      });
    } catch (e) {
      if (handleApiError(e)) return;
      console.error(e);
    }
  };

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearching(true);

    try {
      const params = new URLSearchParams();

      if (keyword.trim() !== "") {
        params.set("q", keyword.trim());
      }

      params.set("sort", sort);
      params.set("page", "1");
      params.set("perPage", String(data.perPage));

      const nextData = await apiFetch<ReservationResponse>(
        `/reservations?${params.toString()}`
      );
      setData(nextData);
    } catch (e) {
      if (handleApiError(e)) return;
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = async () => {
    setKeyword("");
    setSort("date_asc");
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("perPage", String(data.perPage));

      const nextData = await apiFetch<ReservationResponse>(
        `/reservations?${params.toString()}`
      );

      setData(nextData);
    } catch (e) {
      if (handleApiError(e)) return;
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > data.totalPages) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams();

      if (keyword.trim() !== "") {
        params.set("q", keyword.trim());
      }
      params.set("sort", sort);
      params.set("page", String(newPage));
      params.set("perPage", String(data.perPage));

      const nextData = await apiFetch<ReservationResponse>(
        `/reservations?${params.toString()}`
      );
      setData(nextData);
    } catch (e) {
      if (handleApiError(e)) return;
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  if (reservations.length === 0) {
    return (
      <div>
        <SearchForm
          keyword={keyword}
          setKeyword={setKeyword}
          sort={sort}
          setSort={setSort}
          isSearching={isSearching}
          onSubmit={handleSearch}
          onReset={handleReset}
        />
        <p>予約はまだありません</p>
      </div>
    );
  }

  const startIndex = (data.page - 1) * data.perPage + 1;
  const endIndex = Math.min(data.page * data.perPage, data.totalCount);

  return (
    <div
      className={
        isPending || isSearching ? "opacity-70 space-y-4" : "space-y-4"
      }
    >
      <SearchForm
        keyword={keyword}
        setKeyword={setKeyword}
        sort={sort}
        setSort={setSort}
        isSearching={isSearching}
        onSubmit={handleSearch}
        onReset={handleReset}
      />

      <ul className="space-y-4">
        {reservations.map((r: Reservation) => (
          <li key={r.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-500">{r.name}</span>
              <span className="text-sm text-gray-500">
                {new Date(r.date).toLocaleString("ja-JP")}
              </span>
            </div>
            {r.note && (
              <p className="text-sm text-gray-700 mb-1">メモ: {r.note}</p>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_CLASS[r.status]
                }`}
              >
                ステータス: {STATUS_LABEL[r.status]}
              </span>
              <div className="flex items-center gap-3 text-xs">
                <Link
                  href={`/reservations/${r.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  編集
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span>
          全 {data.totalCount} 件中 {startIndex}〜{endIndex} 件を表示
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(data.page - 1)}
            disabled={isSearching || data.page <= 1}
            className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            前へ
          </button>
          <span>
            {data.page}/{data.totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(data.page + 1)}
            disabled={isSearching || data.page >= data.totalPages}
            className="px-2 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationsList;
