import _ from "lodash"
import { exampleFlows, exampleWorkspaces } from "../../data/exampleData"
import { formatForFlowchart, parseYAML } from "../../helpers"
import {
  ADD_LINK,
  CREATE_NEW_FLOW,
  ADD_NODE,
  DELETE_FLOW,
  DELETE_LINK,
  DELETE_NODE,
  DUPLICATE_FLOW,
  IMPORT_FLOW,
  initialFlowChart,
  LOAD_FLOW,
  SET_FLOW_ARGUMENTS,
  UPDATE_NODE,
  UPDATE_SELECTED_FLOW,
  UPDATE_NODE_DATA,
  LOAD_WORKSPACE,
  CREATE_NEW_WORKSPACE,
  UPDATE_SELECTED_WORKSPACE,
  DELETE_WORKSPACE,
  defaultFlow,
  defaultJinaVersion,
  defaultFlowArguments,
  defaultSelectedFlowId,
  defaultSelectedWorkspaceId,
} from "./flows.constants"
import {
  Flow,
  FlowActionTypes,
  FlowElement,
  Flows,
  FlowState,
  NodeData,
  Workspace,
  Workspaces,
} from "./flows.types"
import { nanoid } from "nanoid"
import produce from "immer"
import { isNodeConnection } from "../../helpers/typeCheckers"
import {
  createLink,
  createEdge,
  createNode,
  isFlowNode,
  isFlowEdge,
} from "../../helpers/flow-chart"
import { Connection } from "react-flow-renderer/dist/types"

export const saveFlowsToStorage = (state: FlowState) => {
  let toSave: { [id: string]: Flow } = {}
  Object.entries(state.flows).forEach(([id, flow]) => {
    if (flow.type === "user-generated") toSave[id] = flow
  })
  localStorage.setItem("userFlows", JSON.stringify(toSave))
}

export const saveWorkspacesToStorage = (state: FlowState) => {
  let toSave: { [id: string]: Workspace } = {}
  const { workspaces } = state
  Object.entries(workspaces).forEach(([id, workspace]: [string, Workspace]) => {
    if (workspace.type === "user-generated") toSave[id] = workspace
  })
  localStorage.setItem("userWorkspaces", JSON.stringify(toSave))
}

function getUserFlows(): Flows {
  const storedFlows = localStorage.getItem("userFlows")
  const userFlows = storedFlows ? JSON.parse(storedFlows) : null
  return _.isEmpty(userFlows) ? defaultFlow : userFlows
}

function getUserWorkspaces(): Workspaces {
  const storedWorkspaces = localStorage.getItem("userWorkspaces")
  const userWorkspaces = storedWorkspaces ? JSON.parse(storedWorkspaces) : null
  return _.isEmpty(userWorkspaces)
    ? {
        _userWorkspace: {
          name: "Workspace 1",
          type: "user-generated",
          daemon_endpoint: "",
          isConnected: false,
          workspace_id: "",
          files: [],
          selectedFlowId: defaultSelectedFlowId,
          flows: {
            ...getUserFlows(),
          },
          flowArguments: defaultFlowArguments,
        },
      }
    : userWorkspaces
}

function getExampleFlows() {
  const flows: Flows = {}

  Object.entries(exampleFlows).forEach(([id, flow]) => {
    const parsed = parseYAML(flow.yaml)
    if (parsed?.data) {
      const formatted = formatForFlowchart(parsed.data)
      flows[id] = {
        ...flow,
        workspaceId: defaultSelectedWorkspaceId,
        type: "user-generated",
        isConnected: false,
        flowChart: formatted,
      }
    }
  })
  return flows
}

function getExampleWorkspaces() {
  return exampleWorkspaces
}

const initialState: FlowState = {
  selectedWorkspaceId: "_userWorkspace",
  workspaces: {
    ...getExampleWorkspaces(),
    ...getUserWorkspaces(),
  },
  flows: {
    ...getExampleFlows(),
    ...getUserFlows(),
  },
}

const flowReducer = produce((draft: FlowState, action: FlowActionTypes) => {
  switch (action.type) {
    case CREATE_NEW_FLOW: {
      draft = _createNewFlow(draft)
      break
    }
    case DUPLICATE_FLOW: {
      draft = _createNewFlow(draft, action.payload)
      break
    }
    case IMPORT_FLOW: {
      draft = _createNewFlow(draft, action.payload)
      break
    }
    case DELETE_FLOW:
      {
        const flowId = action.payload
        draft.flows = _.omit(draft.flows, flowId)

        const nonExampleFlows = Object.entries(draft.flows).filter(
          ([id, flow]: [string, Flow]) => flow.type !== "example"
        )

        if (
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId ===
            flowId &&
          nonExampleFlows.length
        ) {
          const idFirstNonExampleFlow = nonExampleFlows[0][0]
          draft.workspaces[
            draft.selectedWorkspaceId
          ].selectedFlowId = idFirstNonExampleFlow
        } else if (!nonExampleFlows.length) {
          draft.flows._userFlow = {
            name: "Custom Flow 1",
            workspaceId: defaultSelectedWorkspaceId,
            type: "user-generated",
            isConnected: false,
            flowChart: initialFlowChart,
          }
          draft.workspaces[
            draft.selectedWorkspaceId
          ].selectedFlowId = defaultSelectedFlowId
        }
      }
      break
    case UPDATE_SELECTED_FLOW: {
      const flowUpdate = action.payload
      if (draft.workspaces[draft.selectedWorkspaceId].selectedFlowId) {
        const selectedFlow =
          draft.flows[
            draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
          ]
        draft.flows[
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
        ] = {
          ...selectedFlow,
          ...flowUpdate,
        }
      }
      break
    }
    case SET_FLOW_ARGUMENTS: {
      draft.workspaces[draft.selectedWorkspaceId].flowArguments = action.payload
      break
    }
    case LOAD_FLOW:
      draft.workspaces[draft.selectedWorkspaceId].selectedFlowId =
        action.payload
      break
    case UPDATE_NODE: {
      const { nodeUpdate, nodeId } = action.payload
      const selectedFlowId =
        draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
      const oldNodeIndex = draft.flows[
        selectedFlowId
      ].flowChart.elements.findIndex((element) => element.id === nodeId)

      if (oldNodeIndex >= 0) {
        const oldNode =
          draft.flows[selectedFlowId].flowChart.elements[oldNodeIndex]

        const newNode = {
          ...oldNode,
          ...nodeUpdate,
        }

        draft.flows[selectedFlowId].flowChart.elements[oldNodeIndex] = newNode
      }
      break
    }
    case UPDATE_NODE_DATA: {
      const { nodeDataUpdate, nodeId } = action.payload
      const selectedFlowId =
        draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
      const oldNodeIndex = draft.flows[
        selectedFlowId
      ].flowChart.elements.findIndex((element) => element.id === nodeId)

      if (oldNodeIndex >= 0) {
        const oldNode =
          draft.flows[selectedFlowId].flowChart.elements[oldNodeIndex]

        const newData: NodeData = {
          ...oldNode.data,
          ...nodeDataUpdate,
        }

        draft.flows[selectedFlowId].flowChart.elements[
          oldNodeIndex
        ].data = newData
      }

      break
    }
    case ADD_NODE:
      const { data, id, position } = action.payload
      const newNode = createNode(id, data, position)
      draft.flows[
        draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
      ].flowChart.elements.push(newNode)
      break
    case DELETE_NODE:
      const nodeId = action.payload
      const selectedFlow =
        draft.flows[draft.workspaces[draft.selectedWorkspaceId].selectedFlowId]
      const withoutLinksAndNode = selectedFlow.flowChart.elements.filter(
        (element) => {
          if (isFlowNode(element)) return element.id !== nodeId

          if (isFlowEdge(element))
            return element.source !== nodeId && element.target !== nodeId

          return true
        }
      )

      draft.flows[
        draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
      ].flowChart.elements = withoutLinksAndNode
      break
    case ADD_LINK:
      const { source, target } = action.payload
      const newLink = createEdge(source, target)
      draft.workspaces[draft.selectedWorkspaceId].flows[
        draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
      ].flowChart.elements.push(newLink)
      break
    case DELETE_LINK:
      if (isNodeConnection(action.payload)) {
        const { source, target } = action.payload as Connection
        draft.flows[
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
        ].flowChart.elements = draft.flows[
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
        ].flowChart.elements.filter(
          (element: FlowElement) =>
            !(
              isFlowEdge(element) &&
              (element.source === source || element.target === target)
            )
        )
      } else {
        const linkId = action.payload
        draft.flows[
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
        ].flowChart.elements = draft.flows[
          draft.workspaces[draft.selectedWorkspaceId].selectedFlowId
        ].flowChart.elements.filter(
          (element: FlowElement) => linkId !== element.id
        )
      }
      break
    case LOAD_WORKSPACE:
      draft.selectedWorkspaceId = action.payload
      break
    case CREATE_NEW_WORKSPACE:
      draft = _createNewWorkspace(draft)
      break
    case UPDATE_SELECTED_WORKSPACE: {
      const workspaceUpdate = action.payload
      if (draft.selectedWorkspaceId) {
        const selectedWorkspace = draft.workspaces[draft.selectedWorkspaceId]
        draft.workspaces[draft.selectedWorkspaceId] = {
          ...selectedWorkspace,
          ...workspaceUpdate,
        }
      }
      break
    }
    case DELETE_WORKSPACE:
      {
        const workspaceId = action.payload as string
        draft.workspaces = _.omit(draft.workspaces, workspaceId)

        const nonExampleWorkspaces = Object.entries(draft.workspaces).filter(
          ([id, workspace]: [string, Workspace]) => workspace.type !== "example"
        )

        if (draft.selectedWorkspaceId === workspaceId) {
          const idFirstNonExampleWorkspace = nonExampleWorkspaces[0][0]
          draft.selectedWorkspaceId = idFirstNonExampleWorkspace
        } else if (!nonExampleWorkspaces.length) {
          draft.workspaces._userWorkspace = {
            name: "Workspace 1",
            type: "user-generated",
            daemon_endpoint: "",
            isConnected: false,
            daemon_id: "",
            files: [],
            jina_version: defaultJinaVersion,
            selectedFlowId: defaultSelectedFlowId,
            flowArguments: defaultFlowArguments,
          }
        }
        draft.selectedWorkspaceId = "_userWorkspace"
      }
      break
  }

  saveWorkspacesToStorage(draft)
}, initialState)

function _createNewFlow(
  draft: FlowState,
  customYAML?: string,
  id = nanoid()
): FlowState {
  const prefixString = "Custom Flow"

  let userFlows = Object.values(draft.flows).filter((flow: Flow) =>
    flow.name.startsWith(prefixString)
  )

  const userFlowNumbers = userFlows
    .map(
      (userFlow: Flow) =>
        parseInt(userFlow.name.substring(prefixString.length)) || 0
    )
    .sort((a, b) => a - b)

  const largestNumber = userFlowNumbers[userFlowNumbers.length - 1] || 0

  let flowChart = initialFlowChart

  if (customYAML) {
    const parsed = parseYAML(customYAML)
    if (parsed?.data) flowChart = formatForFlowchart(parsed.data)
  }

  draft.flows[id] = {
    isConnected: false,
    name: `${prefixString} ${largestNumber + 1}`,
    type: "user-generated",
    workspaceId: draft.selectedWorkspaceId,
    flowChart,
  }
  draft.workspaces[draft.selectedWorkspaceId].selectedFlowId = id
  return draft
}

function _createNewWorkspace(draft: FlowState): FlowState {
  const prefixString = "Workspace"

  let userWorkspaces = Object.values(
    draft.workspaces
  ).filter((workspace: Workspace) => workspace.name.startsWith(prefixString))

  const userWorkspaceNumbers = userWorkspaces
    .map(
      (userWorkspace: Workspace) =>
        parseInt(userWorkspace.name.substring(prefixString.length)) || 0
    )
    .sort((a, b) => a - b)

  const largestNumber =
    userWorkspaceNumbers[userWorkspaceNumbers.length - 1] || 0

  const workspaceId = nanoid()
  const flowId = nanoid()

  draft.workspaces[workspaceId] = {
    jina_version: defaultJinaVersion,
    flowArguments: defaultFlowArguments,
    selectedFlowId: flowId,
    name: `${prefixString} ${largestNumber + 1}`,
    type: "user-generated",
    daemon_endpoint: "",
    isConnected: false,
    daemon_id: null,
    files: [],
  }
  draft = _createNewFlow(draft, undefined, flowId)
  draft.workspaces[draft.selectedWorkspaceId].selectedFlowId = flowId
  return draft
}

export default flowReducer
