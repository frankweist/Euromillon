# Copilot Instructions for Peña Euromillones

## Overview

This project is a web application for managing a lottery group, specifically for the Peña Euromillones. It includes functionalities for participant management, payment tracking, draw creation, and result recording.

## Architecture

- **Main Components**: The application is structured around several key components:
  - **Dashboard**: Displays key metrics and allows for quick actions.
  - **Participants**: Manages participant data, including search and filtering options.
  - **Payments**: Tracks monthly payments and allows for bulk actions.
  - **Draws**: Facilitates the creation and management of lottery draws.
  - **Results**: Records and displays results of draws.

- **Data Flow**: Data flows between components primarily through JavaScript functions defined in `app.js`, which handles user interactions and updates the UI accordingly.

## Developer Workflows

- **Building**: The project is a static web application, so no build process is required. Simply open `index.html` in a browser.
- **Testing**: Manual testing is performed by interacting with the UI. Ensure all functionalities work as expected.
- **Debugging**: Use browser developer tools to inspect elements and debug JavaScript errors.

## Project Conventions

- **File Structure**: Follow the existing structure for adding new features. JavaScript files are located in the `js/` directory, and styles are in `styles.css`.
- **Naming Conventions**: Use descriptive names for functions and variables. For example, `btnExportJson` clearly indicates its purpose.

## Integration Points

- **External Dependencies**: Currently, there are no external libraries or frameworks used. All functionality is implemented using vanilla JavaScript.
- **Cross-Component Communication**: Components communicate through shared state managed in the global scope of `app.js`. Use event listeners to handle user interactions and update the UI accordingly.

## Examples

- **Adding a Participant**: Use the `btnAddParticipante` button to trigger the addition of a new participant. Ensure to validate input before adding.
- **Creating a Draw**: The `btnCreateDraw` button in the Draws section allows users to create a new draw based on eligible participants.

## Conclusion

This document serves as a guide for AI coding agents to understand the Peña Euromillones project structure, workflows, and conventions. For any further clarifications, refer to the code comments and the structure of existing files.
