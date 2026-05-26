type SelectableNode = {
  id: string;
  kind: string;
  label: string;
};

export type UiState = {
  activeRouteId: string | null;
  selectedNodeId: string | null;
};

export function createInitialUiState(activeRouteId: string | null): UiState {
  return {
    activeRouteId,
    selectedNodeId: activeRouteId,
  };
}

export function selectNode(state: UiState, node: SelectableNode): UiState {
  return {
    activeRouteId: node.kind === "route" ? node.id : state.activeRouteId,
    selectedNodeId: node.id,
  };
}
