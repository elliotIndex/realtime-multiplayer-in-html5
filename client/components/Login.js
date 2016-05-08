'use strict';

const React = require('react');

class Login extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            server: 'http://localhost:4004',
            name: ''
        };
    }

    handleValueChange (event) {
        this.setState({
            [event.target.name]: event.target.value
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
                        Name
                        <input
                            type="text"
                            name="name"
                            required={ true }
                            minlength={ 1 }
                            value={ this.state.name }
                            onChange={ this.handleValueChange.bind(this) }
                        />
                    </label>
                    <label>
                        Server url
                        <input
                            type="text"
                            name="server"
                            required={ true }
                            minlength={ 1 }
                            value={ this.state.server }
                            onChange={ this.handleValueChange.bind(this) }
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
