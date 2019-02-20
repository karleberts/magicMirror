import * as React from 'react';
import * as R from 'ramda';

const styles = {
	container: {
		position: 'absolute' as 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100vh',
		opacity: 0,
		transition: 'opacity 0.2s',
	},
	videoEl: {
		minWidth: '100%',
		minHeight: '100%',
		height: 'auto',
		width: 'auto',
		position: 'absolute' as 'absolute',
	},
	overlay: {
		position: 'absolute' as 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		backgroundColor: '#000',
		opacity: 0.1,
		zIndex: 1,
	},
};

interface IVideoEffectProps {
    onEnded(): void,
    src: string,
}
interface IVideoEffectState {
    styles: any
}
class VideoEffect extends React.Component<IVideoEffectProps, IVideoEffectState> {
    videoRef: any;
    videoEl: any;
	constructor (props: IVideoEffectProps) {
		super(props);
		this.show = this.show.bind(this);
		this.onEnded = this.onEnded.bind(this);
		this.videoRef = (c: any) => this.videoEl = c;
		this.state = {
			styles,
		};
	}
	show () {
		this.setState({
			styles: R.merge(styles, {
				container: R.merge(styles.container, {
					opacity: 1,
				}),
			}),
		}, () => this.videoEl.play());
	}
	onEnded () {
		this.setState({
			styles: R.merge(styles, {
				container: R.merge(styles.container, {
					opacity: 0,
				}),
			}),
		}, () => {
			window.setTimeout(this.props.onEnded, 200);
		});
	}
	render () {
		const { styles } = this.state;
		return (
			<div style={styles.container}>
				<video
					onCanPlayThrough={this.show}
					onEnded={this.onEnded}
					preload="auto"
					ref={this.videoRef}
					src={this.props.src}
					style={styles.videoEl}
				/>
				<div
					style={styles.overlay}
				/>
			</div>
		);
	}
}
export default VideoEffect;