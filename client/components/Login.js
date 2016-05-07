'use strict';

const React = require('react');

class Login extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            server: 'http://localhost:4004'
        };
    }

    handleServerChange (event) {
        this.setState({
            server: event.target.value
        });
    }

    render () {
        return (
            <div className="center">
                <form
                    onSubmit={ (event) => {
                        event.preventDefault();

                        this.props.submitHandler(this.state);
                    } }
                >
                    <label>
                        Server url
                        <input
                            type="text"
                            value={ this.state.server }
                            onChange={ this.handleServerChange.bind(this) }
                        />
                    </label>
                    <input
                        type="submit"
                        value="Login"
                    />
                </form>
            </div>
        );
    }
}

Login.propTypes = {
    submitHandler: React.PropTypes.func.isRequired
};

module.exports = Login;
