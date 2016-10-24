import React, { Component } from 'react';
import { Alert, Modal, Panel, Form } from 'react-bootstrap';
import 'whatwg-fetch';

import Immutable from 'immutable';
import SearchBox from './SearchBox.js';
import filters from '../filters.js';
import FilterEditor from './FilterEditor.js';
import Stats from './Stats.js';
import TweetsTable from './TweetsTable.js';
import Tweet from '../Tweet.js';

// Root application component
class App extends Component {

    static propTypes = {
        // the URL (or subpath) from which the app will retrieve tweets via a simple GET request
        tweetsServiceURL: React.PropTypes.string
    }

    static defaultProps = {
        tweetsServiceURL: '/tweets'
    }

    constructor() {
        super();
        this.state = {
            // Immutable.List<Tweet> : list of all retrieved tweets (unsorted, unfiltered); see Tweet.js for tweet properties
            tweets : null,
            // whether the client is currently waiting for results to be fetched from server
            fetching : false,
            // active filter values (key is index of filter in this.filters)
            filterValues : Immutable.Map(),
            // whether the statistics modal window is currently displayed
            showStats : false,
            // currently displayed error message
            error: null,
        }
        // listing of available filters
        this.filters = [
            filters.date,
            filters.fullText,
            filters.tweetLength,
            filters.mentions,
            filters.hashtags,
            filters.favourites,
            filters.hashtag,
            filters.mention
        ];
    }

    fetchTweets(user) {
        this.setState({fetching:true, error:null});
        fetch(this.props.tweetsServiceURL+"?u="+encodeURIComponent(user)).then((response) => {
            if (!this.state.fetching) return; // we no longer want the data
            this.setState({fetching:false});
            if (response.status >= 200 && response.status < 300) {
                return response.text();
            } else if (response.status >= 400 && response.status < 500) {
                this.showError('No data for this user!');
            } else {
                this.showError('Ooops! Something went wrong while fetching user data from Twitter. (Code '+response.status+')');
            }
        }).then((body)=> {
            if (body) {
                this.loadTweets(Array.from(JSON.parse(body)));
            }
        });
    }

    // display error message in the results area
    showError(err) {
        this.setState({error: err});
    }

    // show statistics modal
    showStats() {
        this.setState({showStats : true});
    }

    // hide statistics modal
    hideStats() {
        this.setState({showStats : false});
    }

    // load tweets from the timeline object generated by Twitter API
    loadTweets(timeline) {
        var transformed = timeline.map((tweetData,i) => {
            return new Tweet(i,tweetData);
        });

        this.setState({tweets: Immutable.List(transformed)});
    }

    // forget results
    resetResults() {
        this.setState({tweets: null, error: null })
    }

    render() {

        const renderResults=() => {
            if (this.state.fetching) {
                // currently loading data - show nothing
                return;
            } else if (this.state.error) {
                // error occured while getting data - display it 
                return (
                    <Alert bsStyle="danger">
                      <p>{this.state.error}</p>
                    </Alert>
                );
            } else if (!this.state.tweets) {
                // waiting for user selection - show nothing
                return;
            } else {
                // display results
                // apply filters the tweet list
                var displayList = this.state.tweets.filter((item) => {
                        // ok only if all filters match
                        return this.filters.every((filter, i) => {
                            if (!filter.apply(item, this.state.filterValues.get(i))) {
                                return false;
                            }
                            return true;
                        });
                    })
                

                return (
                    <div>
                    <Panel
                        header="Filters"
                        collapsible
                    >
                        <Form horizontal bsSize="small">
                        {this.filters.map((filter, key) => { return (
                            <FilterEditor key={key}
                                label={filter.label}
                                value={this.state.filterValues.get(key)}
                                placeholder={filter.prompt}
                                onChange={(value) => {
                                    this.setState({filterValues : this.state.filterValues.set(key, value)});
                                }}
                            />
                        )})}
                        </Form>
                    </Panel>
                    <a href="#" onClick={this.showStats.bind(this)}>Show statistics</a>
                    <TweetsTable tweets={displayList}/>
                    <Modal show={this.state.showStats} onHide={this.hideStats.bind(this)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Statistics</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Stats tweets={this.state.tweets}/>
                        </Modal.Body>
                    </Modal> 
                    </div>               
                );            
            }

        }

        return (
            <div className="container">
                <h2>Twitter browser demo</h2>
                <SearchBox 
                    fetching={this.state.fetching}
                    onSubmit={this.fetchTweets.bind(this)}
                    onChange={this.resetResults.bind(this)}
                />
                {renderResults()}
            </div>
        );
    }
}

export default App;
