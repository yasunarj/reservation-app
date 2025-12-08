import { FormEvent } from "react";

type SearchFormProps = {
  keyword: string;
  setKeyword: (v: string) => void;
  sort: "date_asc" | "date_desc";
  setSort: (v: "date_asc" | "date_desc") => void;
  isSearching: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

const SearchForm = ({
  keyword,
  setKeyword,
  sort,
  setSort,
  isSearching,
  onSubmit,
  onReset,
}: SearchFormProps) => {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <input
        type="text"
        placeholder="名前・メモで検索"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="flex-1 min-w-[160px] border rounded px-3 py-2 text-sm"
      />
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as "date_asc" | "date_desc")}
      >
        <option value="date_asc">日付が早い順</option>
        <option value="date_desc">日付が遅い順</option>
      </select>
      <button
        type="submit"
        disabled={isSearching}
        className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-60"
      >
        {isSearching ? "検索中..." : "検索"}
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={isSearching}
        className="px-3 py-2 text-white text-sm rounded disabled:opacity-60 bg-gray-800"
      >
        リセット
      </button>
    </form>
  );
};

export default SearchForm;
