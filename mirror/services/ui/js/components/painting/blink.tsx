import * as React from 'react';

import Client from 'event-bus/client';
//const wink  = require('!file-loader!./resources/wink.mp4');

/*
see atmosfx.com/products/unliving-portraits for original videos
*/
const angry = require('!file-loader!./resources/angry.mp4');
const laugh = require('!file-loader!./resources/laugh.mp4');
const sadzombie = require('!file-loader!./resources/sadzombie.mp4');
const surprise = require('!file-loader!./resources/surprise.mp4');

const sources = [
	angry,
    laugh,
    sadzombie,
    surprise,
];

interface IBlinkProps {
    eventBusClient: Client,
    onEnded(): void,
}
class Blink extends React.Component<IBlinkProps> {
    src: string;
	constructor (props: IBlinkProps) {
		super(props);
		this.src = sources[Math.floor(Math.random() * sources.length)];
		// const relSrc = sources[Math.floor(Math.random() * sources.length)];
		// const a = document.createElement('a');
		// a.href = relSrc;
		// this.src = a.href;
	}

	componentDidMount () {
		this.props.eventBusClient
            .request('uiServer', 'video.play', {src: this.src})
			.subscribe(() => {
				this.props.onEnded();
			});
	}

	render () {
		return null;
	}
}
export default Blink;
