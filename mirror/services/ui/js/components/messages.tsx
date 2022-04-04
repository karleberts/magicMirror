import * as React from 'react';

import Client from 'event-bus/client';
import { filter, take } from 'rxjs/operators';
import { timer } from 'rxjs';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

type Props = {
    eventBusClient: Client
}
type State = {
    message: string | null,
};
function noop () {}
const style = {
    position: 'absolute',
    top: '80%',
    width: '100%',
    textAlign: 'center',
};

export default class Messages extends React.Component<Props, State> {
    cleanup: () => void = noop;

    constructor (props: Props) {
        super(props);
        window.karl = props.eventBusClient;
        props.eventBusClient.request
        this.state = {
            message: null,
        };
    }

    componentWillMount () {
    	this.props.eventBusClient
            .request$
            .pipe(
                filter(req => req.topic === 'ui.showMessage'),
            )
            .subscribe(req => {
                this.cleanup();
                this.setState({message: req.params.message});
                const timeout = req.params.duration || 10;
                const hideObserver = timer(timeout * 1000)
                    .pipe(
                        take(1),
                    )
                    .subscribe(() => {
                        this.cleanup();
                        this.setState({message: null});
                    });
                this.cleanup = () => {
                    this.cleanup = noop;
                    hideObserver.unsubscribe();
                };
            });
    }

    componentWillUnmount () {
        this.cleanup();
    }

    render () {
        return (
            <ReactCSSTransitionGroup
                transitionName="ui"
                transitionEnterTimeout={250}
                transitionLeaveTimeout={250}
            >
                {this.state.message && (
                    <div style={style}>
                        {this.state.message}
                    </div>
                )}
            </ReactCSSTransitionGroup>
        );
    }
}