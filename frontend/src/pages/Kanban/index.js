import React, { useState, useEffect, useContext } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import { toast } from 'react-toastify';
import { i18n } from '../../translate/i18n';
import { useHistory } from 'react-router-dom';
import { setKanbanLaneOrder, getKanbanLaneOrder } from '../../services/companyKanbanService';
import {
  Button,
  TextField,
  Paper,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Typography,
} from '@material-ui/core';
import { format, subDays } from 'date-fns';
import { Can } from '../../components/Can';
import MainContainer from '../../components/MainContainer';
import MainHeader from '../../components/MainHeader';
import MainHeaderButtonsWrapper from '../../components/MainHeaderButtonsWrapper';
import Title from '../../components/Title';
import KanbanBoard from './KanbanBoard';

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    display: 'flex',
    padding: theme.spacing(1),
    overflowX: 'auto',
    ...theme.scrollbarStyles,
    borderRadius: '12px',
    minHeight: '60vh',
  },
  button: {
    borderRadius: '10px',
    height: 40,
  },
  dateInput: {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
    marginRight: theme.spacing(1),
  },
  sortSelect: {
    minWidth: 180,
    marginRight: theme.spacing(1),
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
  },
  searchInput: {
    minWidth: 260,
    marginRight: theme.spacing(1),
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
    },
  },
  summaryPaper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    borderRadius: '12px',
  },
  summaryCard: {
    minWidth: 170,
    padding: theme.spacing(1.2),
    borderRadius: '12px',
    background: '#f8f9fb',
    border: '1px solid #e6e9ef',
  },
  summaryLabel: {
    fontSize: '0.8rem',
    color: '#667085',
    marginBottom: theme.spacing(0.5),
  },
  summaryValue: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: '#101828',
  },
  quickFiltersPaper: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    marginBottom: theme.spacing(1),
    borderRadius: '12px',
  },
  checkboxLabel: {
    marginRight: theme.spacing(1),
  },
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queueIds = user.queues.map(queue => queue.UserQueue.queueId);

  const [sortOrder, setSortOrder] = useState(() => {
    return localStorage.getItem('sortOrder') || 'lastMessageTime';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const [laneOrder, setLaneOrder] = useState(null);
  const [loadingLaneOrder, setLoadingLaneOrder] = useState(true);

  useEffect(() => {
    localStorage.setItem('sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    const loadLaneOrder = async () => {
      try {
        const savedOrder = await getKanbanLaneOrder();
        setLaneOrder(savedOrder);
      } catch (error) {
        console.error('Erro ao carregar ordem das lanes:', error);
      } finally {
        setLoadingLaneOrder(false);
      }
    };

    if (user && user.id) {
      loadLaneOrder();
    }
  }, [user]);

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getOpportunityValue = ticket => {
    const customFields = ticket?.contact?.extraInfo || [];
    const valueField = customFields.find(field => field.name === 'valor');
    const opportunityValue = valueField ? parseFloat(valueField.value) : 0;
    return Number.isNaN(opportunityValue) ? 0 : opportunityValue;
  };

  const applyTicketFilters = (ticketList = []) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return ticketList.filter(ticket => {
      const contactName = ticket?.contact?.name?.toLowerCase() || '';
      const contactNumber = ticket?.contact?.number?.toLowerCase() || '';
      const lastMessage = ticket?.lastMessage?.toLowerCase() || '';
      const ticketNumber = String(ticket?.id || '');
      const queueName = ticket?.queue?.name?.toLowerCase() || '';
      const userName = ticket?.user?.name?.toLowerCase() || '';

      const matchesSearch =
        !normalizedSearch ||
        contactName.includes(normalizedSearch) ||
        contactNumber.includes(normalizedSearch) ||
        lastMessage.includes(normalizedSearch) ||
        ticketNumber.includes(normalizedSearch) ||
        queueName.includes(normalizedSearch) ||
        userName.includes(normalizedSearch);

      const matchesUnread = !onlyUnread || Number(ticket?.unreadMessages || 0) > 0;
      const matchesUnassigned = !onlyUnassigned || !ticket?.user;
      const matchesMine = !onlyMine || ticket?.user?.id === user.id;

      return matchesSearch && matchesUnread && matchesUnassigned && matchesMine;
    });
  };

  const fetchTags = async () => {
    try {
      const response = await api.get('/tag/kanban/');
      const fetchedTags = response.data.lista || [];
      setTags(fetchedTags);
      fetchTickets(fetchedTags);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTickets = async (fetchedTags = tags) => {
    try {
      const { data } = await api.get('/ticket/kanban', {
        params: {
          queueIds: JSON.stringify(queueIds),
          startDate,
          endDate,
        },
      });

      setTickets(data.tickets || []);
      organizeLanes(fetchedTags, data.tickets || []);
    } catch (err) {
      console.log(err);
      setTickets([]);
      organizeLanes(fetchedTags, []);
    }
  };

  useEffect(() => {
    const companyId = user.companyId;

    const onAppMessage = data => {
      if (['create', 'update', 'delete'].includes(data.action)) {
        fetchTickets();
      }
    };

    socket.on(`company-${companyId}-ticket`, onAppMessage);
    socket.on(`company-${companyId}-appMessage`, onAppMessage);

    return () => {
      socket.off(`company-${companyId}-ticket`, onAppMessage);
      socket.off(`company-${companyId}-appMessage`, onAppMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user.companyId]);

  const handleSearchClick = () => {
    fetchTickets();
  };

  const handleStartDateChange = event => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = event => {
    setEndDate(event.target.value);
  };

  const updateTicket = updatedTicket => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const organizeLanes = (fetchedTags = tags, fetchedTickets = tickets) => {
    const filteredTickets = applyTicketFilters(fetchedTickets);
    const sortedTickets = [...filteredTickets];

    if (sortOrder === 'ticketNumber') {
      sortedTickets.sort((a, b) => a.id - b.id);
    } else if (sortOrder === 'lastMessageTime') {
      sortedTickets.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } else if (sortOrder === 'oldestUpdate') {
      sortedTickets.sort(
        (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt)
      );
    } else if (sortOrder === 'unreadFirst') {
      sortedTickets.sort((a, b) => {
        const unreadDiff = Number(b.unreadMessages || 0) - Number(a.unreadMessages || 0);
        if (unreadDiff !== 0) {
          return unreadDiff;
        }
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      });
    } else if (sortOrder === 'valorDesc') {
      sortedTickets.sort((a, b) => {
        const valorA = getOpportunityValue(a);
        const valorB = getOpportunityValue(b);
        return valorB - valorA;
      });
    }

    const defaultTickets = sortedTickets.filter(
      ticket => !ticket.tags || ticket.tags.length === 0
    );

    const lanesData = [
      {
        id: 'lane0',
        title: i18n.t('tagsKanban.laneDefault'),
        tickets: defaultTickets,
        color: '#757575',
      },
      ...fetchedTags.map(tag => {
        const taggedTickets = sortedTickets.filter(ticket =>
          (ticket.tags || []).some(t => t.id === tag.id)
        );
        return {
          id: tag.id.toString(),
          title: tag.name,
          tickets: taggedTickets,
          color: tag.color || '#757575',
        };
      }),
    ];

    if (laneOrder && laneOrder.length > 0) {
      const orderedLanes = [];
      const laneMap = new Map(lanesData.map(lane => [lane.id, lane]));

      laneOrder.forEach(laneId => {
        if (laneMap.has(laneId)) {
          orderedLanes.push(laneMap.get(laneId));
          laneMap.delete(laneId);
        }
      });

      laneMap.forEach(lane => orderedLanes.push(lane));
      setLanes(orderedLanes);
    } else {
      setLanes(lanesData);
    }
  };

  useEffect(() => {
    if (!loadingLaneOrder) {
      organizeLanes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tags,
    tickets,
    sortOrder,
    laneOrder,
    loadingLaneOrder,
    searchTerm,
    onlyUnread,
    onlyUnassigned,
    onlyMine,
  ]);

  const handleCardMove = async (ticketId, targetLaneId) => {
    ticketId = parseInt(ticketId, 10);

    try {
      await api.delete(`/ticket-tags/${ticketId}`);

      if (targetLaneId !== 'lane0') {
        await api.put(`/ticket-tags/${ticketId}/${targetLaneId}`);
        toast.success('Ticket movido com sucesso!');
      } else {
        toast.success('Ticket removido da coluna!');
      }

      fetchTickets();
    } catch (err) {
      console.log(err);
      toast.error('Não foi possível mover o ticket.');
    }
  };

  const handleAddColumnClick = () => {
    history.push('/tagsKanban');
  };

  const handleSortOrderChange = event => {
    setSortOrder(event.target.value);
  };

  const handleLaneReorder = async (sourceIndex, destinationIndex) => {
    if (user.profile !== 'admin') {
      toast.error('Apenas administradores podem reordenar as lanes do Kanban');
      return;
    }

    const newLanes = Array.from(lanes);
    const [reorderedLane] = newLanes.splice(sourceIndex, 1);
    newLanes.splice(destinationIndex, 0, reorderedLane);

    setLanes(newLanes);

    const newLaneOrder = newLanes.map(lane => lane.id);
    setLaneOrder(newLaneOrder);

    try {
      await setKanbanLaneOrder(newLaneOrder);
      toast.success('Ordem das lanes atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao salvar ordem das lanes:', error);
      toast.error('Erro ao salvar ordem das lanes');
    }
  };

  const filteredTickets = applyTicketFilters(tickets);

  const summary = {
    total: filteredTickets.length,
    unread: filteredTickets.filter(ticket => Number(ticket.unreadMessages || 0) > 0).length,
    mine: filteredTickets.filter(ticket => ticket?.user?.id === user.id).length,
    unassigned: filteredTickets.filter(ticket => !ticket?.user).length,
    totalValue: filteredTickets.reduce((acc, ticket) => acc + getOpportunityValue(ticket), 0),
  };

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <MainContainer>
      <MainHeader>
        <Title>{i18n.t('Kanban')}</Title>
        <MainHeaderButtonsWrapper>
          <FormControl
            variant="outlined"
            size="small"
            className={classes.sortSelect}
          >
            <InputLabel htmlFor="sort-order-select">Ordenar por</InputLabel>
            <Select
              native
              value={sortOrder}
              onChange={handleSortOrderChange}
              label="Ordenar por"
              inputProps={{
                name: 'sortOrder',
                id: 'sort-order-select',
              }}
            >
              <option value="lastMessageTime">Última Mensagem</option>
              <option value="unreadFirst">Não lidas primeiro</option>
              <option value="oldestUpdate">Mais tempo aguardando</option>
              <option value="ticketNumber">Número do Ticket</option>
              <option value="valorDesc">Valor (maior para menor)</option>
            </Select>
          </FormControl>

          <TextField
            label="Buscar contato, ticket ou mensagem"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={classes.searchInput}
          />

          <TextField
            label="Data de início"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
            className={classes.dateInput}
            size="small"
          />
          <TextField
            label="Data de fim"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            InputLabelProps={{
              shrink: true,
            }}
            variant="outlined"
            className={classes.dateInput}
            size="small"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearchClick}
            className={classes.button}
          >
            Buscar
          </Button>
          <Can
            role={user.profile}
            perform="dashboard:view"
            yes={() => (
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddColumnClick}
                className={classes.button}
              >
                + Adicionar colunas
              </Button>
            )}
          />
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper variant="outlined" className={classes.summaryPaper}>
        <div className={classes.summaryCard}>
          <Typography className={classes.summaryLabel}>Tickets visíveis</Typography>
          <Typography className={classes.summaryValue}>{summary.total}</Typography>
        </div>

        <div className={classes.summaryCard}>
          <Typography className={classes.summaryLabel}>Com não lidas</Typography>
          <Typography className={classes.summaryValue}>{summary.unread}</Typography>
        </div>

        <div className={classes.summaryCard}>
          <Typography className={classes.summaryLabel}>Meus tickets</Typography>
          <Typography className={classes.summaryValue}>{summary.mine}</Typography>
        </div>

        <div className={classes.summaryCard}>
          <Typography className={classes.summaryLabel}>Sem responsável</Typography>
          <Typography className={classes.summaryValue}>{summary.unassigned}</Typography>
        </div>

        <div className={classes.summaryCard}>
          <Typography className={classes.summaryLabel}>Valor total</Typography>
          <Typography className={classes.summaryValue}>
            {currencyFormatter.format(summary.totalValue)}
          </Typography>
        </div>
      </Paper>

      <Paper variant="outlined" className={classes.quickFiltersPaper}>
        <FormControlLabel
          className={classes.checkboxLabel}
          control={
            <Checkbox
              checked={onlyUnread}
              onChange={e => setOnlyUnread(e.target.checked)}
              color="primary"
            />
          }
          label="Somente não lidas"
        />
        <FormControlLabel
          className={classes.checkboxLabel}
          control={
            <Checkbox
              checked={onlyMine}
              onChange={e => setOnlyMine(e.target.checked)}
              color="primary"
            />
          }
          label="Somente meus tickets"
        />
        <FormControlLabel
          className={classes.checkboxLabel}
          control={
            <Checkbox
              checked={onlyUnassigned}
              onChange={e => setOnlyUnassigned(e.target.checked)}
              color="primary"
            />
          }
          label="Somente sem responsável"
        />
      </Paper>

      <Paper variant="outlined" className={classes.mainPaper}>
        <KanbanBoard
          lanes={lanes}
          onCardMove={handleCardMove}
          onLaneReorder={handleLaneReorder}
          updateTicket={updateTicket}
          isAdmin={user.profile === 'admin'}
        />
      </Paper>
    </MainContainer>
  );
};

export default Kanban;