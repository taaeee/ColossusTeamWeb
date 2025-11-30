import { File, Folder, Tree } from "@/components/ui/file-tree";

export function FileTreeDemo() {
  return (
    <div className="bg-background relative flex h-[300px] w-3/4 flex-col items-center justify-center overflow-hidden rounded-lg border">
      <Tree
        className="bg-background overflow-hidden rounded-md p-2"
        initialSelectedId="7"
        initialExpandedItems={["1", "2", "3", "4", "5", "6"]}
        elements={ELEMENTS}
      >
        <Folder element="left4dead2" value="1">
          <Folder value="2" element="addons">
            <File value="3">
              <p>Stanberry.ttf</p>
            </File>
            <File value="4">
              <p>font_-_stanberry.vpk</p>
            </File>
          </Folder>
          <Folder value="5" element="cfg">
            <File value="6">
              <p>autoexec.cfg</p>
            </File>
          </Folder>
        </Folder>
      </Tree>
    </div>
  );
}

const ELEMENTS = [
  {
    id: "1",
    isSelectable: true,
    name: "left4dead2",
    children: [
      {
        id: "2",
        isSelectable: true,
        name: "addons",
        children: [
          {
            id: "3",
            isSelectable: true,
            name: "Stanberry.ttf",
          },
          {
            id: "4",
            isSelectable: true,
            name: "font_-_stanberry.vpk",
          },
        ],
      },
      {
        id: "5",
        isSelectable: true,
        name: "cfg",
        children: [
          {
            id: "6",
            isSelectable: true,
            name: "autoexec.cfg",
          },
        ],
      },
    ],
  },
];
