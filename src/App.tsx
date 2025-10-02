import { useState, useEffect, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputSwitch } from "primereact/inputswitch";
import { Paginator } from "primereact/paginator";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { ChevronDown } from "lucide-react";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";

interface ArtObject {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

export default function App() {
  const [artObjects, setArtObjects] = useState<ArtObject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [first, setFirst] = useState<number>(0);
  const rows = 12;
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [rowClick, setRowClick] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const overlayRef = useRef<OverlayPanel>(null);
  const [selectLimit, setSelectLimit] = useState<number>(12);
  const currentPage = first / rows + 1;

  const fetchArtworks = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}&fields=id,title,place_of_origin,artist_display,inscriptions,date_start,date_end`
      );
      const data = await response.json();
      const artworks: ArtObject[] = data.data.map((item: any) => ({
        id: item.id,
        title: item.title || "Unknown",
        place_of_origin: item.place_of_origin || "Unknown",
        artist_display: item.artist_display || "Unknown",
        inscriptions: item.inscriptions || "None",
        date_start: item.date_start || 0,
        date_end: item.date_end || 0,
      }));
      setArtObjects(artworks);
      setTotalRecords(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks(currentPage);
  }, [currentPage]);

  const onPageChange = (event: any) => {
    setFirst(event.first);
  };

  const onSelectionChange = (e: { value: ArtObject[] }) => {
    const newSelectedIds = new Set(selectedIds);
    e.value.forEach((row) => newSelectedIds.add(row.id));
    artObjects.forEach((row) => {
      if (!e.value.some((r) => r.id === row.id)) {
        newSelectedIds.delete(row.id);
      }
    });
    setSelectedIds(newSelectedIds);
  };

  const currentPageSelection = artObjects.filter((row) =>
    selectedIds.has(row.id)
  );

  const handleSelectFilteredRows = async () => {
    if (selectLimit <= 0) return;
    let selected: number[] = [];
    let page = 1;
    let hasMore = true;
    while (selected.length < selectLimit && hasMore) {
      const { artworks, total } = await fetchArtworksPage(page, rows);
      selected = [...selected, ...artworks.map((a) => a.id)];
      hasMore = page * rows < total;
      page++;
    }
    const newSelectedIds = new Set(selectedIds);
    selected.slice(0, selectLimit).forEach((id) => newSelectedIds.add(id));
    setSelectedIds(newSelectedIds);
    overlayRef.current?.hide();
  };

  const fetchArtworksPage = async (page: number, pageSize: number) => {
    const response = await fetch(
      `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${pageSize}&fields=id`
    );
    const data = await response.json();
    const artworks: ArtObject[] = data.data.map((item: any) => ({ id: item.id } as ArtObject));
    return { artworks, total: data.pagination.total };
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-8">Art Collection</h1>

      <div className="mb-4 flex items-center gap-2">
        <label>Row click selection:</label>
        <InputSwitch checked={rowClick} onChange={(e) => setRowClick(e.value)} />
      </div>

      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-red-600">Error: {error}</p>}

      {!loading && !error && (
        <>
          <DataTable
            value={artObjects}
            selectionMode={rowClick ? "single" : "multiple"}
            selection={currentPageSelection}
            onSelectionChange={onSelectionChange}
            dataKey="id"
            tableStyle={{ minWidth: "60rem" }}
            rowClassName={(data) =>
              selectedIds.has(data.id) ? "bg-blue-100" : "bg-white"
            }
          >
            {!rowClick && (
              <Column
                selectionMode="multiple"
                header={
                  <div className="flex items-center justify-center gap-1">
                    <OverlayPanel ref={overlayRef} showCloseIcon>
                      <div className="flex flex-col gap-2 p-2">
                        <label>Number of rows to select:</label>
                        <InputText
                          type="number"
                          value={selectLimit}
                          onChange={(e) =>
                            setSelectLimit(Number(e.target.value) || 0)
                          }
                          className="p-inputtext-sm"
                        />
                        <Button
                          label="Select Rows"
                          className="p-button-sm"
                          onClick={handleSelectFilteredRows}
                        />
                      </div>
                    </OverlayPanel>
                    <ChevronDown
                      size={18}
                      className="cursor-pointer relative left-[50px]"
                      onClick={(e) => overlayRef.current?.toggle(e)}
                    />
                  </div>
                }
                headerStyle={{ width: "3rem", textAlign: "center" }}
              />
            )}
            <Column field="title" header="Title" />
            <Column field="place_of_origin" header="Place of Origin" />
            <Column field="artist_display" header="Artist" />
            <Column field="inscriptions" header="Inscriptions" />
            <Column field="date_start" header="Date Start" />
            <Column field="date_end" header="Date End" />
          </DataTable>

          <Paginator
            first={first}
            rows={rows}
            totalRecords={totalRecords}
            onPageChange={onPageChange}
            className="mt-4"
          />
        </>
      )}
    </div>
  );
}
