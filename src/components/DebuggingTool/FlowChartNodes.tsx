import React, { useState } from "react"
import { Handle, Position } from "react-flow-renderer"
import styled from "@emotion/styled"
import { useTheme } from "@emotion/react"
import { Chunk, Doc, Match, Score } from "../../views/DebuggingTool"

import {
  Card,
  Collapse,
  List,
  ListItem,
  ListItemSecondaryAction,
  Typography,
  Box,
  Grid,
  Button,
  CardHeader,
} from "@material-ui/core"

import { ExpandLess, ExpandMore } from "@material-ui/icons"
import { mimeTypeFromDataURI } from "../../helpers/utils"
import { isEmpty } from "lodash"

const NodeImagePreview = styled.img`
  display: block;
  width: 100%;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
`

const AudioContainer = styled.audio`
  width: 100%;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
`

const VideoContainer = styled.video`
  display: block;
  margin-bottom: 0.5rem;
  margin-top: 0.5rem;
  width: 100%;
`

export const NodeBigText = styled.p`
  font-size: 3rem;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`

const ListMarker = styled.span`
  display: inline-block;
  height: 0.5rem;
  width: 0.75rem;
  border-top: 1px solid ${(props) => props.color};
  margin-right: 0.5rem;
`

const WrappedText = styled.div`
  word-break: break-word;
  padding-left: 1rem;
  width: 100%;
`

const LightText = styled.i`
  color: ${(props) => props.color};
`

const NodeVideoPreview = ({ src }: { src: string }) => {
  return <VideoContainer src={src} controls />
}

const NodeAudioPreview = ({ src }: { src: string }) => {
  return <AudioContainer src={src} controls />
}

export const NodeMediaPreview = ({ uri }: { uri: string }) => {
  const mime_type = mimeTypeFromDataURI(uri)
  if (mime_type.startsWith("image")) return <NodeImagePreview src={uri} />
  if (mime_type.startsWith("audio")) return <NodeAudioPreview src={uri} />
  if (mime_type.startsWith("video")) return <NodeVideoPreview src={uri} />
  return <NodeBigText>{uri}</NodeBigText>
}

type ChartNodeProps = {
  id: string
  data: {
    name: string
    item: Chunk | Match | Doc
    onScoreClick: (score: Score) => void
    hasInput: boolean
    hasOutput: boolean
  }
  isDragging: boolean
  selected: boolean
  type: "chunk" | "match" | "doc"
}

export const ChartNode = ({
  data,
  selected,
  isDragging,
  type,
}: ChartNodeProps) => {
  const { palette } = useTheme()
  const { item, onScoreClick, hasInput = true, hasOutput = true, name } = data
  const parentId = "parent_id" in item ? item.parent_id : undefined
  const score = "score" in item ? item.score : undefined
  const { id: itemId, uri, mime_type, text } = item
  const elevation = isDragging ? 20 : selected ? 10 : 2

  let style = {}

  if (type === "match")
    style = {
      backgroundColor: palette.filters[0].main,
    }
  else if (type === "chunk")
    style = {
      backgroundColor: palette.filters[3].main,
    }

  return (
    <div>
      {hasInput && <Handle type="source" position={Position.Left}></Handle>}
      <Card elevation={elevation} color="red" style={style}>
        <CardHeader
          style={{ paddingBottom: ".5em" }}
          action={
            score && (
              <Button size="large" onClick={() => onScoreClick(score as Score)}>
                score: {score.value || "0.0"}
              </Button>
            )
          }
        />
        <Box maxWidth="30rem" padding="1em" paddingTop="0em">
          {text && <NodeBigText>"{text}"</NodeBigText>}
          {uri && mimeTypeFromDataURI(uri) && <NodeMediaPreview uri={uri} />}
          <Grid container>
            <Grid item xs={6}>
              {mime_type && (
                <Typography color="textSecondary" gutterBottom>
                  {mime_type}
                </Typography>
              )}
            </Grid>

            <Grid item xs={6}>
              <Box textAlign="right"></Box>
            </Grid>
          </Grid>
          <div style={{ backgroundColor: "#ffffff80" }}>
            <PropertyList data={item} key="main table" />
          </div>

          {parentId && (
            <Box marginTop="0.5rem">
              <Typography color="textSecondary">
                ParentId: {parentId}
              </Typography>
            </Box>
          )}
        </Box>
      </Card>
      {hasOutput && <Handle type="target" position={Position.Right}></Handle>}
    </div>
  )
}

export const PropertyList = ({ data, nested }: any) => {
  return (
    <List disablePadding dense>
      {Object.entries(data).map(([key, value]: any) => (
        <PropertyListItem
          key={key}
          itemKey={key}
          itemValue={value}
          nested={nested}
        />
      ))}
    </List>
  )
}

export const PropertyListItem = ({
  itemKey,
  itemValue,
  nested,
}: {
  itemKey: string
  itemValue: any
  nested?: boolean
}) => {
  const [show, setShow] = useState(false)
  const { palette } = useTheme()

  const toggleShow = () => {
    setShow((prev) => !prev)
  }

  let isObject = false
  if (typeof itemValue === "object" && itemValue !== null) {
    isObject = true
  }

  if (isObject && isEmpty(itemValue)) return null
  if (
    itemValue === 0 ||
    itemValue === "unset" ||
    itemValue === null ||
    itemValue === "" ||
    itemValue === {}
  )
    return null

  return (
    <div
      style={{
        marginLeft: nested ? "2em" : "0px",
        borderLeft: `1px solid ${palette.grey[500]}`,
        backgroundColor: show
          ? isObject
            ? `${palette.grey[100]}80`
            : palette.grey[200]
          : "inherit",
      }}
    >
      <ListItem button onClick={toggleShow} style={{ paddingLeft: "0px" }}>
        <Grid container>
          <Grid item xs={6}>
            <Typography noWrap>
              <ListMarker color={palette.grey[500]} />
              {itemKey}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography noWrap>
              {isObject ? (
                <LightText color={palette.grey[500]}>Object</LightText>
              ) : (
                String(itemValue)
              )}
            </Typography>
          </Grid>
        </Grid>
        <ListItemSecondaryAction>
          {isObject && <>({Object.keys(itemValue).length})</>}
          {show ? <ExpandLess /> : <ExpandMore />}
        </ListItemSecondaryAction>
      </ListItem>
      <Collapse in={show}>
        {isObject ? (
          Object.keys(itemValue).length ? (
            show && <PropertyList data={itemValue} nested />
          ) : (
            <ListItem>
              <WrappedText>This Object is empty</WrappedText>
            </ListItem>
          )
        ) : (
          <ListItem>
            <WrappedText>
              <div>
                <b>key: </b>
                {itemKey}
              </div>
              <div>
                <b>value: </b>
                {itemValue}
              </div>
            </WrappedText>
          </ListItem>
        )}
      </Collapse>
    </div>
  )
}
