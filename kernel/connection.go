package kernel

import (
	"context"
	"encoding/json"
	"fmt"

	"os"

	"github.com/pebbe/zmq4"
	"github.com/rs/zerolog/log"
)

// connectionFileMixin
type Connection struct {
	DataDir    string
	IP         string
	Transport  string
	KernelName string
	Context    context.Context

	HbPort      int
	ShellPort   int
	IopubPort   int
	StdinPort   int
	ControlPort int
}

func (km *KernelManager) getConnectionInfo() Connection {
	return km.ConnectionInfo
}

type ConnectionFileData struct {
	Transport       string `json:"transport"`
	IP              string `json:"ip"`
	Key             string `json:"key"`
	StdinPort       int    `json:"stdin_port"`
	IopubPort       int    `json:"iopub_port"`
	ShellPort       int    `json:"shell_port"`
	HbPort          int    `json:"hb_port"`
	ControlPort     int    `json:"control_port"`
	SignatureScheme string `json:"signature_scheme"`
	KernelName      string `json:"kernel_name"`
}

func (km *KernelManager) writeConnectionFile(connectionFile string) error {
	// Open the file for writing, create it if it doesn't exist, or truncate it if it does.
	file, err := os.Create(connectionFile)
	log.Info().Msgf("writing connection info to %s", file.Name())
	if err != nil {
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Create a JSON encoder and set indentation for pretty-printing.
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "    ")

	data := ConnectionFileData{
		Transport:       km.ConnectionInfo.Transport,
		IP:              km.ConnectionInfo.IP,
		Key:             km.Session.Key,
		StdinPort:       km.ConnectionInfo.StdinPort,
		IopubPort:       km.ConnectionInfo.IopubPort,
		ShellPort:       km.ConnectionInfo.ShellPort,
		HbPort:          km.ConnectionInfo.HbPort,
		ControlPort:     km.ConnectionInfo.ControlPort,
		SignatureScheme: km.Session.SignatureScheme,
		KernelName:      km.KernelName,
	}

	// Encode the data as JSON and write it to the file.
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	return nil
}

/*********************************************************************
**********************************************************************
***                  Create Connected Sockets                      ***
**********************************************************************
*********************************************************************/

func (conn *Connection) makeURL(channel string, port int) string {

	if conn.Transport == "tcp" {
		return fmt.Sprintf("tcp://%s:%d", conn.IP, port)
	}
	return fmt.Sprintf("%s://%s-%d", conn.Transport, conn.IP, port)
}

func (conn *Connection) ConnectShell() *zmq4.Socket {
	channel := "shell"
	url := conn.makeURL(channel, conn.ShellPort)
	socket, _ := zmq4.NewSocket(zmq4.DEALER)
	socket.Connect(url)
	return socket

}

func (conn *Connection) ConnectControl() *zmq4.Socket {
	channel := "control"
	url := conn.makeURL(channel, conn.ControlPort)
	socket, _ := zmq4.NewSocket(zmq4.DEALER)
	socket.Connect(url)
	return socket
}

func (conn *Connection) ConnectIopub() *zmq4.Socket {
	channel := "iopub"
	url := conn.makeURL(channel, conn.IopubPort)
	socket, _ := zmq4.NewSocket(zmq4.SUB)
	socket.SetSubscribe("")
	socket.Connect(url)
	return socket

}

func (conn *Connection) ConnectStdin() *zmq4.Socket {
	channel := "stdin"
	url := conn.makeURL(channel, conn.StdinPort)
	socket, _ := zmq4.NewSocket(zmq4.DEALER)
	socket.Connect(url)
	return socket

}

func (conn *Connection) ConnectHb() *zmq4.Socket {
	channel := "hb"
	url := conn.makeURL(channel, conn.HbPort)
	socket, _ := zmq4.NewSocket(zmq4.REQ)
	socket.Connect(url)
	return socket
}
