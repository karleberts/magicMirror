import React from 'react';

const phrases = [
	'kill kill kill',
	'boo!',
	'help me!',
	'murder',
	'body count',
	'blood sacrifice',
	"he's watching",
	'look behind you',
	'he comes at night',
];
const CASES = [
	String.prototype.toUpperCase,
	String.prototype.toLowerCase
];

function getRandomFromArray (arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

const fonts = [
	"'Gloria Hallelujah', cursive",
	"'Permanent Marker', cursive",
	"'Love Ya Like A Sister', cursive",
];

const randomCase = str => str.split('')
	.map(letter => getRandomFromArray(CASES).call(letter))
	.join('');

function getContainerStyle () {
	return {
		fontFamily: getRandomFromArray(fonts),
		fontSize: Math.floor(Math.random() * 10 + 90),
		color: '#fff',
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
	};
}

function getWordStyle (index, phraseLength) {
	const heightPct = Math.floor(1 / phraseLength * 100);
	const direction = (Math.random() > 0.5) ? 'right' : 'left';
	return {
		position: 'fixed',
		top: `${Math.min(Math.random() * heightPct + (index * heightPct), 70)}%`,
		[direction]: `${Math.floor(Math.random() * 50)}%`,
		transform: `rotate(${Math.random() * 40 - 20}deg) scale(1.3)`,
		display: 'inline-block',
		padding: 32,
		boxSizing: 'border-box',
	};
}

class Words extends React.PureComponent {
	constructor (props){
		super(props);
		this.containerStyle = getContainerStyle();
		this.words = randomCase(getRandomFromArray(phrases))
			.split(' ');
		this.state = {
			index: 0,
		};
	}

	next () {
		window.setTimeout(() => {
			if (this.state.index === this.words.length - 1) {
				return this.props.onEnded();
				// return;
			}
			this.setState({index: this.state.index + 1}, this.next.bind(this));
		}, Math.random() * 100 + 500);
	}

	componentDidMount () {
		this.next();
	}

	render () {
		return (
			<div style={this.containerStyle}>
				<div style={getWordStyle(this.state.index, this.words.length)}>
					{this.words[this.state.index]}
				</div>
			</div>
		);
	}
}
export default Words;
