
import React, { useEffect, useState } from 'react'

import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { toast, ToastContainer } from 'react-toastify'
import { v4 as uuidv4 } from 'uuid'
import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import { keymap } from '@codemirror/view'
import 'react-toastify/dist/ReactToastify.css';

import './NotebookEditor.scss'

import { w3cwebsocket as W3CWebSocket } from 'websocket'
import { BaseApiUrl } from '../config'

const debugMode = true

export default function NotebookEditor (props) {
  interface ICell {
    execution_count: number
    source: string
  }
  interface INotebookModel {
    cells: Array<ICell>
    nbformat: number
    nbformat_minor: number
    metadata: INotebookMetadata
  }


  interface INotebookMetadata {
    kernelspec?: IKernelspecMetadata;
    language_info?: ILanguageInfoMetadata;
    orig_nbformat?: number;
  }

  interface IKernelspecMetadata{
    name: string;
    display_name: string;
  }

  interface ILanguageInfoMetadata {
    name: string;
    codemirror_mode?: string;
    file_extension?: string;
    mimetype?: string;
    pygments_lexer?: string;
  }

  type CellType = 'code' | 'markdown' | 'raw' | string;
  

  const [notebook, setNotebook] = useState<INotebookModel>({ 
                                                    cells: [], 
                                                    nbformat:0, 
                                                    nbformat_minor:0,
                                                    metadata: {}
                                                  })
  const [blankCell, setBlankCell] = useState<ICell>({ execution_count: 0, source: '' })

  const [client, setClient] = useState<IClient>({ send: () => { } })

  interface IKernel {
    name: string
    id: string
  }
  const [kernel, setKernel] = useState<IKernel>({ name: '', id: '' })

  interface ISession {
    id: string
    kernel: IKernel
  }
  const [session, setSession] = useState<ISession>({ id: '', kernel: {id: '', name: ''} })


  const FetchFileData = async (path) => {
    const res = await fetch(BaseApiUrl + '/api/contents?type=notebook&hash=0', {
      method: 'POST',

      body: JSON.stringify({
        path
      })
    })
    const resJson = await res.json()
    setNotebook(resJson.content)
    console.log(resJson['content']);
  }

  useEffect(() => {
    if (props.data.load_required == true) {
      FetchFileData(props.data.path)
      // startASession(props.name, props.path, props.type)
      // listKernels();
      // listAllSessions();
    }
   
  }, [])

  const generateOutput = (data) => {
    if ('outputs' in data) {
      if (typeof (data.outputs[0]) !== 'undefined') {
        // console.log(data.outputs[0]);
        if (data.outputs[0].hasOwnProperty('text')) {
          return <pre>{data.outputs[0].text}</pre>
        }
        if (data.outputs[0].hasOwnProperty('data')) {
          if (data.outputs[0].data.hasOwnProperty('text/html')) {

          }
          if (data.outputs[0].data.hasOwnProperty('image/png')) {
            const blob = 'data:image/png;base64,' + (data.outputs[0].data['image/png'])
            return (
              <div>
                <img src={blob} />
              </div>
            )
          }
          return (

            <div>
              <pre>{data.outputs[0].data['text/plain']}</pre>
              <div dangerouslySetInnerHTML={{ __html: data.outputs[0].data['text/html'] }} />
            </div>
          )
        }
      }

      return JSON.stringify(data.outputs[0])
    }
  }

  interface IClient {
    send: any
  }

  const listAllKernelSpecs = () => {
    // Simple GET request using fetch
    fetch(BaseApiUrl + '/api/kernelspecs')
      .then(async response => await response.json())
      .then(
        (data) => {
          console.log('data')
          console.log(data)
        },
        (error) => {
          console.log('error')
        }

      )
  }

  const listKernels = () => {
    // Simple GET request using fetch
    fetch(BaseApiUrl + 'http://localhost:8888/api/kernels')
      .then(async response => await response.json())
      .then(
        (data) => {
          console.log('kernels running')
          console.log(data)
          if (data.lenghth = 0) {
            
          }
        },
        (error) => {
          console.log('error')
        }

      )
  }

  const listAllSessions = () => {
    // Simple GET request using fetch
    fetch(BaseApiUrl + '/api/sessions')
      .then(async response => await response.json())
      .then(
        (data) => {
          console.log('data')
          console.log(data)
          if (data.lenghth === 0) {
            startASession(props.name, props.path, props.type)
          }
        },
        (error) => {
          console.log('error')
        }

      )
  }

  const startASession = (path, name, type) => {
    // Simple GET request using fetch
    console.log('Starting a session')
    if (session.id === '') {
      if (kernel != null) {
        fetch(BaseApiUrl + '/api/sessions', {
          method: 'POST',
          body: JSON.stringify({
            path: path,
            name: name,
            type: type,
            kernel,
            notebook: { path: path, name: name }
          })

        })
          .then(async response => await response.json())
          .then(
            (data) => {
              console.log('sessions running')
              console.log(data)
              setSession(data)
            },
            (error) => {
              console.log('error')
            }

          )
      } else {
        console.log('No kernel running. Start a kernel first!')
      }
    } else {
      console.log(session)
    }
  }

  const startWebSocket = () => {
    const client1 = new W3CWebSocket('ws://localhost:8888/api/kernels/' + session.kernel.id + '/channels?session_id=' + session.id)

    client1.onopen = () => {
      console.log('WebSocket Client Connected')
    }
    client1.onmessage = (message) => {
      // message = JSON.parse(message.data)
      // if (message.channel === 'iopub') {
      //   console.log('IOPub => ', message)
      //   if (message.msg_type === 'execute_result') {
      //     console.log(message.content.data)
      //     toast(message.content.data['text/plain'])
      //     toast(message.content.data['text/html'])
      //   }
      //   if (message.msg_type === 'stream') {
      //     console.log(message.content.text)
      //     toast(message.content.text)
      //     toast(message.content.text)
      //   }
      // }
      // if (message.channel === 'shell') {
      //   console.log('Shell => ', message)
      // }
    }
    client1.onclose = () => {
      console.log('disconnected')
    }
    setClient(client1)
  }
  interface IHeader {
    msg_id: string // typically UUID, must be unique per message
    session: string // typically UUID, should be unique per session
    username: string
    // ISO 8601 timestamp for when the message is created
    date: string
    //  All recognized message type strings are listed below.
    msg_type: string
    // the message protocol version
    version: string
  }

  interface IMetadata {

  }

  interface IContent {

  }

  interface Imessage {
    header: IHeader
    parent_header: IHeader
    metadata: IMetadata
    content: IContent
    buffers: string[]
  }

  const getTimeStamp = () => {
    const today = new Date()
    return today.toISOString()
  }

  const createExecuteRequestMsg = (code: string) => {
    return {
      silent: false,
      store_history: true,
      user_expressions: {},
      allow_stdin: true,
      stop_on_error: true,
      code: code
    }
  }

  const submitCell = (source: string) => {
    toast(source)
    const message = JSON.stringify({
      buffers: [],
      channel: 'shell',
      content: createExecuteRequestMsg(source),
      header: {
        date: getTimeStamp(),
        msg_id: uuidv4(),
        msg_type: 'execute_request',
        session: session.id,
        username: 'prasunanand',
        version: '5.2'
      },
      metadata: {
        deletedCells: [],
        recordTiming: false,
        cellId: '1cb16896-03e7-480c-aa2b-f1ba6bb1b56d'
      },
      parent_header: {}
    })
    console.log('Sending message', message)
    client.send(message)
  }

  const saveFile = async () => {
    const path = 'demo.ipynb'
    console.log(notebook)
    alert('Saving file')
    const res = await fetch('http://localhost:8888/api/contents/demo.ipynb', {
      method: 'PUT',
      body: JSON.stringify({
        content: JSON.stringify(notebook),
        type: 'file',
        format: 'text'
      })
    })
  }

  const addCellUp = async () =>{
    console.log("add cell Up");
    notebook.cells.push({
      execution_count: 0,
      source: ""})
  }

  const addCellDown = async () =>{
    console.log("add cell Down");
    notebook.cells.push({
      execution_count: 0,
      source: ""})
  }

  const deleteCell = async (index: number) =>{
    console.log("delete cell at index => " + index)
    notebook.cells.pop()
  }

  const nextCell = async (index: number) =>{
    console.log("moving to next index => " + (index + 1 ))
  }

  const prevCell = async (index: number) =>{
    console.log("moving to prev index => " + (index - 1 ))
  }


  // Notebook level

  let index=0

  const saveNotebook =  () => {
    console.log("saving notebook!")
  }
  const addCell =  () => {
    console.log("add cell at index => " + index)
  }
  const cutCell =  () => {
    console.log("cut cell at index => " + index)
  }
  const copyCell =  () => {
    console.log("copy cell at index => " + index)
  }
  const pasteCell =  () => {
    console.log("Paste cell at index => " + index)
  }

  const stopKernel =  () => {
    console.log("Stop Kernel")
  }
  const restartKernel =  () => {
    console.log("Restart kernel")
  }
  const reExecuteNotebook =  () => {
    console.log("ReExecute Notebook")
  }



  return (
    <div className='tab-content'>
      <div className={props.data.display} id='profile' role='tabpanel' aria-labelledby='profile-tab'>
      <NbButtons saveNotebook={saveNotebook}
                addCell={addCell}
                cutCell={cutCell}
                copyCell={copyCell}
                pasteCell={pasteCell}
                submitCell={submitCell}
                stopKernel={stopKernel}
                restartKernel={restartKernel}
                reExecuteNotebook={reExecuteNotebook}
      />
        
      {debugMode && <div>
        <button type='button' onClick={saveFile}>Save file</button>
        <button type='button' onClick={listKernels}>ListKernels</button>
        <button type='button' onClick={()=>startASession(props.data.name, props.data.path, props.data.type)}>StartASession</button>
        <button type='button' onClick={listAllSessions}>ListAllSessions</button>
        <button type='button' onClick={startWebSocket}>StartWebSocket</button>
      </div>
      }
      <div className='editor-body'>
        {
          notebook.cells.map((cell, index) =>
            <Cell key={index} 
                  index={index} 
                  cell={cell} 
                  generateOutput={generateOutput} 
                  submitCell={submitCell} 
                  addCellUp={addCellUp} 
                  addCellDown={addCellDown} 
                  prevCell={prevCell}
                  nextCell={nextCell}
                  deleteCell={deleteCell}
            />
          )
        }
      </div>
    </div>
  </div>
  )
}

function NbButtons(props){
  return (
    <div className='text-editor-tool'>
      <button type='button' className='editor-button' onClick={() => props.saveNotebook()}><i className='fas fa-save' /></button>
      <button type='button' className='editor-button' onClick={() => props.addCell(props.index)}><i className='fas fa-plus' /></button>
      <button type='button' className='editor-button' onClick={() => props.cutCell(props.index)}><i className='fas fa-cut' /></button>
      <button type='button' className='editor-button' onClick={() => props.copyCell(props.index)}><i className='fas fa-copy' /></button>
      <button type='button' className='editor-button' onClick={() => props.pasteCell(props.index)}><i className='fas fa-paste' /></button>
      <button type='button' className='editor-button' onClick={() => props.submitCell(props.index)}><i className='fas fa-play' /></button>
      <button type='button' className='editor-button' onClick={() => props.stopKernel()}><i className='fas fa-square' /></button>
      <button type='button' className='editor-button' onClick={() => props.restartKernel()}><i className='fas fa-redo' /></button>
      <button type='button' className='editor-button' onClick={() => props.reExecuteNotebook()}><i className='fas fa-forward' /></button>
      <select className="form-select editor-select" aria-label="Default select example">
        <option selected>Code</option>
        <option value="1">Markdown</option>
        <option value="2">Raw</option>
      </select>
      
      <div className='ms-auto'>Python [conda env:default]*</div>
      <ToastContainer />
    </div>
  )
}

function CellButtons(props){
  return (
    <div className='cellOptions'>
      <button type='button' className='editor-button' onClick={() => props.submitCell(props.code)}><i className='fas fa-play' /></button>
      <button type='button' className='editor-button' onClick={() => props.copyCell(props.index)}><i className='fas fa-copy' /></button>
      <button type='button' className='editor-button' onClick={() => props.nextCell(props.index)}><i className='fas fa-forward' /></button>
      <button type='button' className='editor-button' onClick={() => props.prevCell(props.index)}><i className='fas fa-backward' /></button>
      <button type='button' className='editor-button' onClick={() => props.addCellUp()}><i className='fas fa-plus' /></button>
      <button type='button' className='editor-button' onClick={() => props.addCellDown()}><i className='fas fa-plus' /></button>
      <button type='button' className='editor-button' onClick={() => props.deleteCell(props.index)}><i className='fas fa-trash' /></button>
      <ToastContainer />
    </div>
  )
}

function Cell (props) {
  const cell = props.cell
  const [fileContents, setFileContents] = useState(cell.source[0])
  if (cell.cell_type === 'markdown') {
    return (
      <Markdown rehypePlugins={[rehypeRaw]}>{fileContents}</Markdown>
    )
  }

  const handleCmdEnter = () => {
    console.log(alert("running the code"))

    return true
  }

  const customKeymap = keymap.of([
    {
      key: 'Mod-s',
      run: handleCmdEnter
    }
  ])

  return (
    <div className='single-line'>

      <div className='serial-no'>[{cell.execution_count}]:</div>
      <div className='inner-content'>
      <CellButtons index={props.index} 
                  code={fileContents} 
                  submitCell={props.submitCell} 
                  addCellUp={props.addCellUp} 
                  addCellDown={props.addCellDown} 
                  deleteCell={props.deleteCell} 
                  nextCell={props.nextCell} 
                  prevCell={props.prevCell}/>
        <CodeMirror
          value={fileContents}
          height='auto'
          width='100%'
          extensions={[python()]}
          onChange={(value) => {
            setFileContents(value)
          }}
        />
        <div className='inner-text'>
          {props.generateOutput(cell)}
        </div>
      </div>
    </div>
  )
}
